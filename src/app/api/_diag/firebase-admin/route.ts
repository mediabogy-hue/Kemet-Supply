export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAdminApp() } from "@/firebase/server-init";

export async function GET() {
  return NextResponse.json({
    ok: true,
    getAdminApp(): getAdminApp().name,
    envPresent: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  });
}
