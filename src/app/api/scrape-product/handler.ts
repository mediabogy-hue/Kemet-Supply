import 'server-only';
import { NextResponse } from "next/server";
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type { ScrapedProductData } from '@/lib/types';

// Configure Genkit once
const ai = genkit({
    plugins: [
        googleAI(),
    ],
    logLevel: "warn",
    enableTracingAndMetrics: true,
});

const ScrapedProductDataSchema = z.object({
  name: z.string().describe("The full name of the product."),
  description: z.string().describe("A detailed and compelling description of the product, suitable for marketing."),
  price: z.number().describe("The numerical price of the product. Extract only the number."),
  imageUrls: z.array(z.string().url()).describe("A list of URLs for high-quality product images."),
  category: z.string().describe("The most appropriate category for the product."),
});

const scrapeProductFlow = ai.defineFlow(
  {
    name: 'scrapeProductFlow',
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: ScrapedProductDataSchema,
  },
  async (input) => {
    
    // Using a more comprehensive set of headers to mimic a real, modern browser
    const response = await fetch(input.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", ";Not.A/Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText} (Status: ${response.status})`);
    }
    const htmlContent = await response.text();

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are an expert web scraper for e-commerce sites. Your task is to analyze the following HTML content from a product page and extract the product information in the requested JSON format. Prioritize structured data like JSON-LD if available in the HTML.

HTML Content (first 50,000 characters):
\`\`\`html
${htmlContent.substring(0, 50000)}
\`\`\`
`,
      output: {
        format: 'json',
        schema: ScrapedProductDataSchema,
      },
    });

    const productData = llmResponse.output();
    if (!productData) {
        throw new Error('AI model failed to extract product data.');
    }
    return productData;
  }
);


export async function handleProductScrape(req: Request) {
    try {
        const body = await req.json();
        const url = body.url;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }
        
        const result = await scrapeProductFlow({ url });

        return NextResponse.json(result);

    } catch (e: any) {
        console.error("Scrape handler error:", e);
        let errorMessage = "An unknown error occurred during scraping.";
        if (e.message) {
            if (e.message.includes('fetch')) {
                errorMessage = "Could not access the provided URL. The site may be blocking automated requests.";
            } else if (e.message.includes('AI model failed')) {
                errorMessage = "The AI could not understand the page content. Please try a different product page.";
            } else {
                errorMessage = e.message;
            }
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
