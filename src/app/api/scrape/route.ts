export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { scrapeProductFromUrl } from '@/ai/flows/scrape-product-flow';

export async function POST(req: Request) {
    try {
        const { productUrl, categoryNames } = await req.json();

        if (!productUrl || !categoryNames) {
            return NextResponse.json({ error: 'Missing productUrl or categoryNames' }, { status: 400 });
        }

        const scrapedData = await scrapeProductFromUrl(productUrl, categoryNames);
        return NextResponse.json({ data: scrapedData });

    } catch (error: any) {
        console.error('[API SCRAPE ERROR]', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: 500 });
    }
}
