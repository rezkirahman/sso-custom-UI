import { NextRequest, NextResponse } from "next/server";
import { clearActiveSession, removeSavedAccount } from "@/lib/session-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { removeAccountId } = body;

    // Bersihkan sesi aktif
    await clearActiveSession();

    // Jika diminta menghapus akun dari daftar tersimpan
    if (removeAccountId) {
      await removeSavedAccount(removeAccountId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Logout Route Error]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
