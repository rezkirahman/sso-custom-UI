import { NextResponse } from "next/server";
import { getSavedAccounts, removeSavedAccount } from "@/lib/session-store";

export async function GET() {
  const accounts = await getSavedAccounts();
  // Sembunyikan token dari response client
  const safeAccounts = accounts.map((a) => ({
    id: a.id,
    displayName: a.displayName,
    phone: a.phone,
    username: a.username,
    lastLoginAt: a.lastLoginAt,
    avatarUrl: a.avatarUrl,
  }));
  return NextResponse.json({ accounts: safeAccounts });
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }
    const updated = await removeSavedAccount(id);
    return NextResponse.json({ success: true, accounts: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus akun";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
