import 'server-only';
import { NextResponse } from "next/server";

export async function handleDiag() {
  try {
    const { getAdminApp } = await import("@/firebase/server-init");
    const app = getAdminApp();
    
    if (!app) {
        return NextResponse.json({
          ok: false,
          error: "Admin App not initialized. Missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY.",
          envPresent: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        }, { status: 503 });
    }

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
