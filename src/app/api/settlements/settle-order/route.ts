import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { handleSettleOrder } = await import("./handler");
    return await handleSettleOrder(req);
  } catch (e: any) {
    console.error("POST /api/settlements/settle-order Route Error:", e);
    return NextResponse.json({ error: "Failed to load API handler." }, { status: 500 });
  }
}
