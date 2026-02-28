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
      prompt: `
        Analyze the following HTML content from an e-commerce product page. 
        Your task is to extract the product's name, a detailed description, its price (as a number), a list of image URLs, and a suitable category.
        Focus on the main content area and ignore irrelevant parts like navigation, footer, or ads.
        Find the most prominent, high-resolution image URLs.
        For the price, extract only the numerical value, ignoring currency symbols or text.

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
  // 1. Fetch the HTML content of the page with more robust headers
  let htmlContent = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText} (Status: ${response.status})`);
    }
    htmlContent = await response.text();
  } catch (fetchError: any) {
    console.error(`Error fetching URL ${url}:`, fetchError);
    throw new Error(`Could not fetch the content from the provided URL. The site may be blocking requests. Error: ${fetchError.message}`);
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
