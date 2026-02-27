import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeProductFromUrl } from '@/ai/flows/scrape-product-flow';

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { productUrl, categoryNames } = await req.json();

        if (!productUrl || !Array.isArray(categoryNames)) {
            return NextResponse.json({ error: 'Missing or invalid productUrl or categoryNames' }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(productUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch URL. Status: ${response.status} ${response.statusText}`);
        }
        const htmlContent = await response.text();

        const scrapedData = await scrapeProductFromUrl({ htmlContent, categoryNames, productUrl });
        
        return NextResponse.json({ data: scrapedData });

    } catch (error: any) {
        console.error('[API SCRAPE - POST HANDLER ERROR]', error);
        let arabicErrorMessage = "فشل جلب البيانات. قد يقوم الخادم بحظر الطلبات أو أن الصفحة غير صالحة.";
        if (error.name === 'AbortError' || error.message.includes('timed out')) {
            arabicErrorMessage = 'لم نتمكن من جلب البيانات من الرابط: انتهت مهلة الطلب.';
        } else if (error instanceof z.ZodError) {
             arabicErrorMessage = `فشل التحقق من صحة البيانات المستلمة من الذكاء الاصطناعي: ${error.errors.map(e => e.message).join(', ')}`;
        } else if (error.message) {
            arabicErrorMessage = error.message;
        }
        return NextResponse.json({ error: arabicErrorMessage }, { status: 500 });
    }
}
