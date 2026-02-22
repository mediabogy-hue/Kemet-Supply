export const runtime = "nodejs";

import { NextResponse } from "next/server";

const VERIFY_TOKEN = "kemet_verify_token_2026"; // سيبه زي ما هو دلوقتي

// 1) Meta Verification (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

// 2) Incoming Messages (POST)
export async function POST(req: Request) {
  const body = await req.json();

  // للتجربة: بس بنستقبل وبنأكد
  console.log("WHATSAPP WEBHOOK RECEIVED:", JSON.stringify(body, null, 2));

  return NextResponse.json({ ok: true });
}
