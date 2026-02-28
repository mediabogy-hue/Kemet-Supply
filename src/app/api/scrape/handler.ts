
import 'server-only';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit once at the module level for efficiency
const ai = genkit({
  plugins: [googleAI()],
  logLevel: 'silent', // Keep logs clean in production
});

// Define the output schema for the scraping result
const ScrapedDataSchema = z.object({
  name: z.string().describe('The name or title of the product.'),
  description: z.string().describe('A detailed description of the product.'),
  price: z.number().describe('The price of the product as a number. Extract only the numerical value.'),
  imageUrls: z.array(z.string().url()).describe('A list of URLs for product images.'),
  category: z.string().describe('A suggested category for the product, like "Electronics" or "Apparel".'),
});

// Define the scraping flow once at the module level
const productScraperFlow = ai.defineFlow(
  {
    name: 'productScraperFlow',
    inputSchema: z.string(),
    outputSchema: ScrapedDataSchema,
  },
  async (html) => {
    const llm = googleAI.model('gemini-1.5-flash');

    const result = await ai.generate({
      model: llm,
      output: { schema: ScrapedDataSchema, format: 'json' }, // Explicitly request JSON for better reliability
      prompt: `You are an expert web scraping agent. Your task is to analyze the following HTML content from an e-commerce product page and extract key information.

First, look for structured data within \`<script type="application/ld+json">\` tags or other JSON objects embedded in the HTML. This is the most reliable source.

If you cannot find structured data, then analyze the raw HTML tags.

Extract the following information and return it as a valid JSON object:
- "name": The product's full name or title.
- "description": A detailed description. If multiple descriptions exist, combine them or choose the most informative one.
- "price": The main price of the product, as a number. Ignore currency symbols, discounts, or price ranges. Find the final price.
- "imageUrls": A list of absolute, full URLs for high-resolution product images (must start with http or https). Prioritize main product images over thumbnails.
- "category": A suggested category for the product, like "Electronics" or "Apparel".

HTML Content:
\`\`\`html
${html}
\`\`\`
      `,
    });

    const output = result.output();
    if (!output) {
      throw new Error("The AI model did not return the expected structured output.");
    }
    return output;
  }
);

// This is the main function that will be dynamically imported by the route
export async function handleScrape(url: string) {
  // 1. Fetch the HTML content of the page
  let htmlContent = '';
  try {
    const response = await fetch(url, {
      headers: {
        // Use a less suspicious, common crawler User-Agent to avoid getting blocked.
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      },
    });

    if (!response.ok) {
      // Handle specific HTTP errors gracefully to give better feedback.
      if (response.status === 403) {
        throw new Error(`The target website blocked the request (Error 403 Forbidden). This site may have anti-scraping measures.`);
      }
      if (response.status === 404) {
        throw new Error(`The requested URL was not found (Error 404 Not Found).`);
      }
      throw new Error(`Failed to fetch URL: ${response.statusText} (Status: ${response.status})`);
    }

    htmlContent = await response.text();
  } catch (fetchError: any) {
    console.error(`Error fetching URL ${url}:`, fetchError);
    // Re-throw a cleaner error message for the frontend to display in a toast.
    throw new Error(fetchError.message || 'An unknown error occurred while fetching the page.');
  }

  // For very large pages, we should truncate to avoid exceeding model token limits
  const truncatedHtml = htmlContent.length > 80000 ? htmlContent.substring(0, 80000) : htmlContent;
  
  // 2. Run the AI flow and return the data with specific error handling
  try {
    return await productScraperFlow(truncatedHtml);
  } catch(flowError: any) {
    console.error(`Genkit flow error for URL ${url}:`, flowError);
    // Rethrow a more user-friendly error
    throw new Error("The AI failed to analyze the page content. The page might have an unsupported structure.");
  }
}
