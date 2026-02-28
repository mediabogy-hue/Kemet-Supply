export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getAdminApp } = await import("@/firebase/server-init");
    const app = getAdminApp();
    return NextResponse.json({
      ok: true,
      getAdminApp: app.name,
      envPresent: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e.message,
        envPresent: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      },
      { status: 500 }
    );
  }
}
