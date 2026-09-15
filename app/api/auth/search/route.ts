import { NextRequest, NextResponse } from "next/server";
import { searchUserByPhone } from "@/lib/zitadel";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json({ error: "Query pencarian diperlukan" }, { status: 400 });
    }

    const user = await searchUserByPhone(q.trim());
    if (!user) {
      return NextResponse.json(
        { error: "Nomor telepon atau akun tidak terdaftar di sistem Agforce." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        username: user.username,
      },
    });
  } catch (err: unknown) {
    console.error("[Search Route Error]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
