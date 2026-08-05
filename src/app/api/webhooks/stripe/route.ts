import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Stripe webhook not implemented yet." },
    { status: 501 }
  );
}
