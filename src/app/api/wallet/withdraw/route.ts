import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      {
        ok: false,
        message: "Withdraw API temporarily disabled"
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error"
      },
      { status: 500 }
    );
  }
}
