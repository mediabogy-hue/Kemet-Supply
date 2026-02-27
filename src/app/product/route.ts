import "server-only";
import { NextResponse } from "next/server";
import { scrapeProductFromUrl } from "@/ai/flows/scrape-product-flow"; 
// لو الاسم عندك مختلف، عدّله لنفس الاسم اللي مُصدَّر من الملف

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
    }

    const data = await scrapeProductFromUrl(url);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}