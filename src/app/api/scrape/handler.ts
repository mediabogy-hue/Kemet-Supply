import 'server-only';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define the output schema for the scraping result
const ScrapedDataSchema = z.object({
  name: z.string().describe('The name or title of the product.'),
  description: z.string().describe('A detailed description of the product.'),
  price: z.number().describe('The price of the product as a number. Extract only the numerical value.'),
  imageUrls: z.array(z.string().url()).describe('A list of URLs for product images.'),
  category: z.string().describe('A suggested category for the product, like "Electronics" or "Apparel".'),
});

// This is the main function that will be dynamically imported
export async function handleScrape(url: string) {
  // 1. Fetch the HTML content of the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  const htmlContent = await response.text();

  // For very large pages, we should truncate to avoid exceeding model token limits
  const truncatedHtml = htmlContent.length > 80000 ? htmlContent.substring(0, 80000) : htmlContent;

  // 2. Initialize Genkit and define the flow inside the handler
  const ai = genkit({
    plugins: [googleAI()],
    logLevel: 'silent', // Keep logs clean
  });

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
        output: { schema: ScrapedDataSchema },
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
        throw new Error("The AI model did not return the expected output.");
      }
      return output;
    }
  );

  // 3. Run the flow and return the data
  return await productScraperFlow(truncatedHtml);
}
