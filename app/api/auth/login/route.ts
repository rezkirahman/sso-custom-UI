import { NextRequest, NextResponse } from "next/server";
import { searchUserByPhone, verifyUserPin, finalizeAuthRequest } from "@/lib/zitadel";
import { saveAccount, setActiveSession } from "@/lib/session-store";
import { decryptPassword } from "@/lib/crypto-server";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ERROR_MESSAGES } from "@/lib/constants/errors";

const loginSchema = z.object({
  phone: z.string().min(8, "Nomor handphone wajib diisi dan valid."),
  encryptedPassword: z.string().min(1, ERROR_MESSAGES.INSECURE_CONNECTION),
  authRequestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: Max 10 failed attempts per 5 minutes per IP
  const rateLimit = checkRateLimit(req, "login", { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi setelah 5 menit." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || "Payload tidak valid" }, { status: 400 });
    }

    const { phone, encryptedPassword, authRequestId } = parseResult.data;

    let rawPassword = "";
    try {
      rawPassword = decryptPassword(encryptedPassword);
    } catch (decErr) {
      console.error("[Login Decrypt Error]", decErr);
      return NextResponse.json({ error: "Gagal mendekripsi kata sandi." }, { status: 400 });
    }

    const password = rawPassword.trim();
    if (!password) {
      return NextResponse.json({ error: ERROR_MESSAGES.MISSING_CREDENTIALS }, { status: 400 });
    }

    // 1. Cari user di ZITADEL
    const user = await searchUserByPhone(phone);
    if (!user) {
      return NextResponse.json(
        { error: "Nomor telepon atau akun tidak terdaftar di sistem Agforce." },
        { status: 404 }
      );
    }

    // 2. Verifikasi Password / PIN
    const verifyResult = await verifyUserPin(user.id, password);
    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || "PIN yang dimasukkan salah." },
        { status: 401 }
      );
    }

    const sessionId = verifyResult.sessionId || `sess_${Date.now()}`;
    const sessionToken = verifyResult.sessionToken || `tok_${Date.now()}`;

    // 3. Simpan akun ke cookie perangkat untuk fitur Account Chooser
    await saveAccount({
      id: user.id,
      displayName: user.displayName,
      phone: user.phone,
      username: user.username,
      sessionId,
      sessionToken,
    });

    // 4. Set sesi aktif
    await setActiveSession({
      sessionId,
      userId: user.id,
      token: sessionToken,
    });

    // 5. Finalisasi Auth Request OIDC ke ZITADEL jika ada request dari Dexter/Venturis
    const authResult = await finalizeAuthRequest(sessionId, sessionToken, authRequestId);

    // Jika berhasil masuk, bersihkan rekam jejak rate limit
    clearRateLimit(req, "login");

    return NextResponse.json({
      success: true,
      user,
      callbackUrl: authResult.callbackUrl || "/login",
    });
  } catch (err: unknown) {
    console.error("[Login Route Error]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
