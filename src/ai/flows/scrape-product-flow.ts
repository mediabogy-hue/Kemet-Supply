'use server';
/**
 * @fileOverview A flow to scrape product data from a given URL.
 *
 * - scrapeProductFromUrl - A server action that fetches a URL and uses an AI flow to extract product data.
 * - ScrapedProductData - The type of the data returned by the scraping flow.
 */
import { z } from 'zod';
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';


const ScrapedProductDataSchema = z.object({
  name: z.string().describe('The name of the product.'),
  description: z.string().describe('The detailed description of the product.'),
  price: z.number().describe('The price of the product. Extract only the number, without currency symbols or text.'),
  imageUrls: z.array(z.string()).describe('A list of all absolute URLs for the product images.'),
  category: z.string().describe('The most relevant category for the product from the provided list.'),
});

export type ScrapedProductData = z.infer<typeof ScrapedProductDataSchema>;

const ScrapeProductInputSchema = z.object({
  htmlContent: z.string().describe("The full HTML content of the product page."),
  categoryNames: z.array(z.string()).describe("A list of available category names to choose from."),
  productUrl: z.string().describe("The URL of the product page for resolving relative image paths."),
});


// This is the server action that the client will call.
export async function scrapeProductFromUrl(productUrl: string, categoryNames: string[]): Promise<ScrapedProductData> {
  
  // Initialize Genkit and define flows INSIDE the function body to prevent bundling issues.
  const ai = genkit({
    plugins: [googleAI()],
  });

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
    3.  **Price**: Find the product's price. Extract only the numerical value, removing any currency symbols (like "EGP" or "ج.م"), text, or commas. For example, if the price is "1,250.50 EGP", extract 1250.50.
    4.  **Image URLs**: Find all *main* product images. If you find relative URLs (e.g., /images/product.jpg), you MUST convert them to absolute URLs using the provided product URL as the base: {{{productUrl}}}. Only include full, valid URLs. Do not include thumbnails or logos unless they are the only images available.
    5.  **Category**: Based on the product's name and description, choose the *single most appropriate* category from the following list. You must return one of these exact strings.
        Available Categories: {{#each categoryNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

    HTML Content:
    \`\`\`html
    {{{htmlContent}}}
    \`\`\`

    IMPORTANT: Return the result as a valid JSON object. If you cannot find a piece of information, you MUST return an empty string for string fields, 0 for the price, and an empty array for image URLs. For category, if you cannot determine a suitable one, you must still choose the most likely category from the provided list. Do not omit any fields. Your response MUST be a single JSON object and nothing else.`,
      config: {
          temperature: 0.0,
      },
      model: 'gemini-1.5-pro-latest'
  });

  const scrapeProductFlow = ai.defineFlow(
    {
      name: 'scrapeProductFlow',
      inputSchema: ScrapeProductInputSchema,
      outputSchema: ScrapedProductDataSchema,
    },
    async ({ htmlContent, categoryNames, productUrl }) => {
      
      // 1. Extract only the body content to reduce noise and context size.
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

      // 2. Advanced sanitization to remove irrelevant tags and reduce whitespace.
      let cleanedHtml = bodyContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
          .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
          .replace(/<!--[\s\S]*?-->/g, ' ');

      // 3. Reduce whitespace and then truncate to fit within the model's context window.
      const simplifiedHtml = cleanedHtml.replace(/\s\s+/g, ' ').substring(0, 200000);

      const { output } = await scrapePrompt({ htmlContent: simplifiedHtml, categoryNames, productUrl });

      if (!output) {
        throw new Error('فشل تحليل بيانات المنتج من استجابة الذكاء الاصطناعي. قد يكون المحتوى غير متوافق أو أن النموذج لم يتمكن من إرجاع بيانات صالحة.');
      }
      
      // Loosen validation for image URLs
      const validatedOutput = ScrapedProductDataSchema.omit({ imageUrls: true }).extend({
          imageUrls: z.array(z.string())
      }).parse(output);

      return validatedOutput;
    }
  );
  
  if (!productUrl) {
    throw new Error('Product URL cannot be empty.');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

  try {
    const response = await fetch(productUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status} ${response.statusText}`);
    }
    const htmlContent = await response.text();

    // Now call the Genkit flow with the HTML content
    const scrapedData = await scrapeProductFlow({ htmlContent, categoryNames, productUrl });
    return scrapedData;
  } catch (error: any) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on error too
    console.error("Error in scrapeProductFromUrl:", error);
    
    if (error.name === 'AbortError') {
         throw new Error('لم نتمكن من جلب البيانات من الرابط: انتهت مهلة الطلب.');
    }
    
    if (error instanceof z.ZodError) {
        throw new Error(`فشل التحقق من صحة البيانات المستلمة من الذكاء الاصطناعي: ${error.errors.map(e => e.message).join(', ')}`);
    }

    // Re-throw a more user-friendly error
    throw new Error(`فشل جلب البيانات. قد يقوم الخادم بحظر الطلبات أو أن الصفحة غير صالحة. التفاصيل: ${error.message}`);
  }
}
