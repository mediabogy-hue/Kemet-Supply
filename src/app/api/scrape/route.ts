
export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit AI within the API route
const ai = genkit({
  plugins: [googleAI()],
});

// All Schemas and Flow logic are now self-contained in this file.

const ScrapedProductDataSchema = z.object({
  name: z.string().describe('The name of the product.'),
  description: z.string().describe('The detailed description of the product.'),
  price: z.number().describe('The price of the product. Extract only the number, without currency symbols or text.'),
  imageUrls: z.array(z.string()).describe('A list of all absolute URLs for the product images.'),
  category: z.string().describe('The most relevant category for the product from the provided list.'),
});

type ScrapedProductData = z.infer<typeof ScrapedProductDataSchema>;

const ScrapeProductInputSchema = z.object({
  htmlContent: z.string().describe("The full HTML content of the product page."),
  categoryNames: z.array(z.string()).describe("A list of available category names to choose from."),
  productUrl: z.string().describe("The URL of the product page for resolving relative image paths."),
});

const scrapePrompt = ai.definePrompt({
    name: 'scrapeProductPrompt_v3', // Renamed to avoid potential caching issues
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
    model: 'gemini-1.5-flash-latest' // Switched to a more stable/faster model
});

const scrapeProductFlow = ai.defineFlow(
  {
    name: 'scrapeProductFlow_v3', // Renamed to avoid potential caching issues
    inputSchema: ScrapeProductInputSchema,
    outputSchema: ScrapedProductDataSchema,
  },
  async ({ htmlContent, categoryNames, productUrl }) => {
    
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

    let cleanedHtml = bodyContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    const simplifiedHtml = cleanedHtml.replace(/\s\s+/g, ' ').substring(0, 150000); // Reduced size slightly for safety

    const { output } = await scrapePrompt({ htmlContent: simplifiedHtml, categoryNames, productUrl });

    if (!output) {
      throw new Error('AI response failed to parse product data. Content may be incompatible or model failed to return valid data.');
    }
    
    const validatedOutput = ScrapedProductDataSchema.parse(output);
    return validatedOutput;
  }
);
  
async function scrapeAndProcess(productUrl: string, categoryNames: string[]): Promise<ScrapedProductData> {
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
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
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

    const scrapedData = await scrapeProductFlow({ htmlContent, categoryNames, productUrl });
    return scrapedData;

  } catch (error: any) {
    clearTimeout(timeoutId); 
    console.error("[API SCRAPE - INNER ERROR]", error);
    
    if (error.name === 'AbortError') {
         throw new Error('Request timed out. Could not retrieve data from the link.');
    }
    
    if (error instanceof z.ZodError) {
        throw new Error(`Data validation failed from AI: ${error.errors.map(e => e.message).join(', ')}`);
    }

    throw new Error(`Failed to fetch data. The server may be blocking requests or the page is invalid. Details: ${error.message}`);
  }
}

export async function POST(req: Request) {
    try {
        const { productUrl, categoryNames } = await req.json();

        if (!productUrl || !Array.isArray(categoryNames)) {
            return NextResponse.json({ error: 'Missing or invalid productUrl or categoryNames' }, { status: 400 });
        }

        const scrapedData = await scrapeAndProcess(productUrl, categoryNames);
        
        return NextResponse.json({ data: scrapedData });

    } catch (error: any) {
        console.error('[API SCRAPE - POST HANDLER ERROR]', error);
        let arabicErrorMessage = "فشل جلب البيانات. قد يقوم الخادم بحظر الطلبات أو أن الصفحة غير صالحة.";
        if (error.message.includes('timed out')) {
            arabicErrorMessage = 'لم نتمكن من جلب البيانات من الرابط: انتهت مهلة الطلب.';
        } else if (error.message.includes('Data validation failed')) {
            arabicErrorMessage = `فشل التحقق من صحة البيانات المستلمة من الذكاء الاصطناعي: ${error.message}`;
        }
        return NextResponse.json({ error: arabicErrorMessage }, { status: 500 });
    }
}
