import { NextRequest, NextResponse } from "next/server";
import { getSavedAccounts, clearActiveSession, removeSavedAccount, clearAccountSession, getActiveSession } from "@/lib/session-store";
import { deleteSession } from "@/lib/zitadel";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { accountId, action = "logout" } = body;

    const savedAccounts = await getSavedAccounts();
    const targetAccount = accountId ? savedAccounts.find((a) => a.id === accountId) : null;
    const active = await getActiveSession();

    // 1. Ambil sessionId untuk dihapus di server ZITADEL
    const sessionIdToDelete = targetAccount?.sessionId || active?.sessionId;

    if (sessionIdToDelete) {
      await deleteSession(sessionIdToDelete);
    }

    let updatedAccounts = savedAccounts;

    // 2. Eksekusi aksi lokal
    if (action === "remove" && accountId) {
      // Hapus akun dari daftar perangkat sepenuhnya
      updatedAccounts = await removeSavedAccount(accountId);
    } else if (action === "logout" && accountId) {
      // Hanya matikan sesi akun tersebut, akun tetap ada di daftar (status keluar)
      updatedAccounts = await clearAccountSession(accountId);
    } else {
      // Logout global sesi aktif
      await clearActiveSession();
    }

    return NextResponse.json({
      success: true,
      accounts: updatedAccounts.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        phone: a.phone,
        username: a.username,
        hasSession: !!a.sessionId,
      })),
    });
  } catch (err: unknown) {
    console.error("[Logout Route Error]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
