import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { handleProductScrape } = await import('./handler');
    return await handleProductScrape(req);
  } catch (e: any) {
    console.error("Scrape Product API Route Error:", e);
    return NextResponse.json({ error: 'Failed to load API handler.' }, { status: 500 });
  }
}
