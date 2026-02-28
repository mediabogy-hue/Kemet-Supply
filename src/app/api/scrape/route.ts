import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Dynamically import the handler to keep server-only code out of the build graph
    const { handleScrape } = await import('./handler');
    const data = await handleScrape(url);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API_SCRAPE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred during scraping.' }, { status: 500 });
  }
}
