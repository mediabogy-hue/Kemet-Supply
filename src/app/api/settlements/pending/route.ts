import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { handleGetPendingSettlements } = await import("./handler");
    return await handleGetPendingSettlements();
  } catch (e: any) {
    console.error("GET /api/settlements/pending Route Error:", e);
    return NextResponse.json({ error: "Failed to load API handler." }, { status: 500 });
  }
}
