import { NextResponse } from 'next/server';
import { z } from 'zod';

// Dynamically import genkit and its plugins to ensure they are only loaded on the server when needed.
async function runScrapeFlow(htmlContent: string, categoryNames: string[], productUrl: string) {
    const { genkit } = await import('@genkit-ai/core');
    const { googleAI } = await import('@genkit-ai/google-genai');
    
    const ai = genkit({
        plugins: [googleAI()],
    });

    const ScrapedProductDataSchema = z.object({
      name: z.string().describe('The name of the product.'),
      description: z.string().describe('The detailed description of the product.'),
      price: z.number().describe('The price of the product. Extract only the number, without currency symbols or text.'),
      imageUrls: z.array(z.string()).describe('A list of all absolute URLs for the product images.'),
      category: z.string().describe('The most relevant category for the product from the provided list.'),
    });

    const ScrapeProductInputSchema = z.object({
      htmlContent: z.string().describe("The full HTML content of the product page."),
      categoryNames: z.array(z.string()).describe("A list of available category names to choose from."),
      productUrl: z.string().describe("The URL of the product page for resolving relative image paths."),
    });
    
    const scrapePrompt = ai.definePrompt({
        name: 'scrapeProductPrompt_v6',
        input: { schema: ScrapeProductInputSchema },
        output: { schema: ScrapedProductDataSchema },
        prompt: `You are an expert web scraper for e-commerce sites like Amazon, Noon, and Jumia. Your task is to extract product information from the provided HTML content and classify it.
          The HTML has been pre-processed to remove scripts, styles, and other irrelevant tags, but it's still complex. Focus on the main content area.

          Please extract the following details precisely:
          1.  **Product Name**: Find the main heading or title of the product. This is often inside an <h1> tag, but could be in another prominent element.
          2.  **Product Description**: Find the most detailed product description. It might be in multiple paragraphs, bullet points (ul/li), or a dedicated description section. Combine them into one coherent string.
          3.  **Price**: Find the product's price. Extract only the numerical value, removing any currency symbols (like "EGP", "ج.م", "$"), text, or commas. For example, if the price is "1,250.50 EGP", extract 1250.50.
          4.  **Image URLs**: Find all *main* product images. Scrape the 'src' attribute. If you find relative URLs (e.g., /images/product.jpg), you MUST convert them to absolute URLs using the provided product URL as the base: {{{productUrl}}}. Only include full, valid URLs. Do not include tiny thumbnails or logos unless they are the only images available.
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
        model: 'gemini-1.5-flash-latest'
    });

    const { output } = await scrapePrompt({ htmlContent, categoryNames, productUrl });

    if (!output) {
      throw new Error('AI response failed to parse product data.');
    }

    return ScrapedProductDataSchema.parse(output);
}


export const runtime = "nodejs";

// The main POST handler
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productUrl, categoryNames } = body;

        if (!productUrl || !Array.isArray(categoryNames)) {
            return NextResponse.json({ error: 'Missing or invalid productUrl or categoryNames' }, { status: 400 });
        }

        // Fetch HTML content from the URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25-second timeout

        const response = await fetch(productUrl, {
            signal: controller.signal,
            headers: { // Use a realistic User-Agent
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch URL. Status: ${response.status}`);
        }
        const htmlContent = await response.text();

        // Clean and simplify HTML before sending to AI to save tokens and improve accuracy
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

        const simplifiedHtml = cleanedHtml.replace(/\s\s+/g, ' ').substring(0, 150000); // Limit size for performance
        
        // Run the isolated Genkit flow
        const validatedOutput = await runScrapeFlow(simplifiedHtml, categoryNames, productUrl);

        return NextResponse.json({ data: validatedOutput });

    } catch (error: any) {
        console.error('[API SCRAPE - POST HANDLER ERROR]', error);
        let arabicErrorMessage = "فشل جلب البيانات. قد يقوم الخادم بحظر الطلبات أو أن الصفحة غير صالحة.";
        if (error.name === 'AbortError') {
            arabicErrorMessage = 'لم نتمكن من جلب البيانات من الرابط: انتهت مهلة الطلب.';
        } else if (error instanceof z.ZodError) {
             arabicErrorMessage = `فشل التحقق من صحة البيانات المستلمة من الذكاء الاصطناعي: ${error.errors.map(e => e.message).join(', ')}`;
        } else if (error.message) {
            arabicErrorMessage = error.message;
        }
        return NextResponse.json({ error: arabicErrorMessage }, { status: 500 });
    }
}
