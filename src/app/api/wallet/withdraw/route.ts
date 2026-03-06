import { NextResponse } from "next/server";
import { handleWithdraw } from "./handler";

export async function POST(request: Request) {
  try {
    // The handler is currently empty, so this will be a no-op until logic is added.
    // However, this structure makes the route valid and buildable.
    // const result = await handleWithdraw(request);
    
    return NextResponse.json({
      ok: false,
      message: "Withdraw API temporarily disabled until full logic is restored"
    }, { status: 501 });

  } catch (error: any) {
    console.error("Withdraw API Error:", error);
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
