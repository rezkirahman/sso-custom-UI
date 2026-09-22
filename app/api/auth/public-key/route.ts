import { NextResponse } from "next/server";
import { getPublicKeyJwk } from "@/lib/crypto-server";

export async function GET() {
  const publicKey = getPublicKeyJwk();
  return NextResponse.json({ publicKey });
}
