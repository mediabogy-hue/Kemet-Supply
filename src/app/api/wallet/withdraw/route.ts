
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // This feature has been deprecated and replaced by a client-side implementation.
  return NextResponse.json(
    { error: 'This API endpoint is no longer in use.' },
    { status: 410 } // 410 Gone
  );
}

    