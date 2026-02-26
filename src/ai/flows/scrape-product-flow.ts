
'use server';
/**
 * @fileOverview A flow to scrape product data from a given URL.
 *
 * - scrapeProductFromUrl - A server action that fetches a URL and uses an AI flow to extract product data.
 * - ScrapedProductData - The type of the data returned by the scraping flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ScrapeProductInputSchema = z.object({
  htmlContent: z.string().describe("The full HTML content of the product page."),
  categoryNames: z.array(z.string()).describe("A list of available category names to choose from."),
});

const ScrapedProductDataSchema = z.object({
  name: z.string().describe('The name of the product.'),
  description: z.string().describe('The detailed description of the product.'),
  price: z.number().describe('The price of the product. Extract only the number, without currency symbols or text.'),
  imageUrls: z.array(z.string().url()).describe('A list of all absolute URLs for the product images.'),
  category: z.string().describe('The most relevant category for the product from the provided list.'),
});

export type ScrapedProductData = z.infer<typeof ScrapedProductDataSchema>;

// Define the prompt using ai.definePrompt for stability and correctness
const scrapePrompt = ai.definePrompt({
    name: 'scrapeProductPrompt',
    input: { schema: ScrapeProductInputSchema },
    output: { schema: ScrapedProductDataSchema },
    prompt: `You are an expert web scraper and product categorizer. Your task is to extract product information from the provided HTML content and classify it into the most relevant category.
    The HTML has been pre-processed to remove scripts, styles, and other irrelevant tags.
    Focus on the main content area to find the product details.

    Please extract the following details precisely:
    1.  **Product Name**: Find the main heading or title of the product. This is often inside an <h1> tag, but could be in another prominent element.
    2.  **Product Description**: Find the most detailed product description available. It might be in multiple paragraphs or a dedicated description section. Combine them into one string.
    3.  **Price**: Find the product's price. Extract only the numerical value, removing any currency symbols, text, or commas. Handle different decimal formats.
    4.  **Image URLs**: Find all *main* product images. Ensure the URLs are absolute. If you find relative URLs (e.g., /images/product.jpg), you must not include them. Only include full, valid URLs. Do not include thumbnails or logos unless they are the only images available.
    5.  **Category**: Based on the product's name and description, choose the *single most appropriate* category from the following list. You must return one of these exact strings.
        Available Categories: {{#each categoryNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

    HTML Content:
    \`\`\`html
    {{{htmlContent}}}
    \`\`\`

    Return the result as a valid JSON object. If you cannot find a piece of information, return an empty string for string fields, 0 for the price, and an empty array for image URLs. For category, if you cannot determine a suitable one, you must still choose the most likely category from the provided list.`,
    config: {
        temperature: 0.0,
    }
});


// Define the flow that uses the structured prompt
const scrapeProductFlow = ai.defineFlow(
  {
    name: 'scrapeProductFlow',
    inputSchema: ScrapeProductInputSchema,
    outputSchema: ScrapedProductDataSchema,
  },
  async ({ htmlContent, categoryNames }) => {
    
    // Advanced sanitization to remove noise and focus on content
    let cleanedHtml = htmlContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    // Reduce whitespace and then truncate
    const simplifiedHtml = cleanedHtml.replace(/\s\s+/g, ' ').substring(0, 200000);

    const { output } = await scrapePrompt({ htmlContent: simplifiedHtml, categoryNames });

    if (!output) {
      throw new Error('Failed to parse product data from the AI response.');
    }
    return output;
  }
);

// This is the server action that the client will call.
export async function scrapeProductFromUrl(productUrl: string, categoryNames: string[]): Promise<ScrapedProductData> {
  if (!productUrl) {
    throw new Error('Product URL cannot be empty.');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

  try {
    const response = await fetch(productUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status} ${response.statusText}`);
    }
    const htmlContent = await response.text();

    // Now call the Genkit flow with the HTML content
    const scrapedData = await scrapeProductFlow({ htmlContent, categoryNames });
    return scrapedData;
  } catch (error: any) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on error too
    console.error("Error in scrapeProductFromUrl:", error);
    
    if (error.name === 'AbortError') {
         throw new Error('Could not retrieve data from the URL: The request timed out.');
    }

    // Re-throw a more user-friendly error
    throw new Error(`Could not scrape data. The server may be blocking requests or the page is invalid. Details: ${error.message}`);
  }
}
