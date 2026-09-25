import { NextRequest, NextResponse } from "next/server";
import { getSavedAccounts, saveAccount, setActiveSession } from "@/lib/session-store";
import { finalizeAuthRequest } from "@/lib/zitadel";
import { z } from "zod";
import { ERROR_MESSAGES } from "@/lib/constants/errors";

const resumeSchema = z.object({
  userId: z.string().min(1, "User ID diperlukan."),
  authRequestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resumeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || "Payload tidak valid" }, { status: 400 });
    }

    const { userId, authRequestId } = parseResult.data;

    // Ambil daftar akun yang tersimpan
    const savedAccounts = await getSavedAccounts();
    const account = savedAccounts.find((a) => a.id === userId);

    if (!account) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan pada perangkat ini. Silakan masukkan PIN kembali.", requirePin: true },
        { status: 404 }
      );
    }

    const sessionId = account.sessionId || `sess_${Date.now()}`;
    const sessionToken = account.sessionToken || `tok_${Date.now()}`;

    // Perbarui waktu login terakhir akun
    await saveAccount({
      id: account.id,
      displayName: account.displayName,
      phone: account.phone,
      username: account.username,
      sessionId,
      sessionToken,
    });

    // Set sesi aktif
    await setActiveSession({
      sessionId,
      userId: account.id,
      token: sessionToken,
    });

    // Finalisasi OIDC Auth Request jika ada
    const authResult = await finalizeAuthRequest(sessionId, sessionToken, authRequestId);

    return NextResponse.json({
      success: true,
      user: {
        id: account.id,
        displayName: account.displayName,
        phone: account.phone,
        username: account.username,
      },
      callbackUrl: authResult.callbackUrl || "/login",
    });
  } catch (err: unknown) {
    console.error("[Resume Route Error]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
