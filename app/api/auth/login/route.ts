import { NextRequest, NextResponse } from "next/server";
import { searchUserByPhone, verifyUserPin, finalizeAuthRequest } from "@/lib/zitadel";
import { saveAccount, setActiveSession } from "@/lib/session-store";
import { decryptPassword } from "@/lib/crypto-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, pin, password: bodyPassword, encryptedPassword, authRequestId } = body;

    let rawPassword = "";
    if (encryptedPassword) {
      try {
        rawPassword = decryptPassword(encryptedPassword);
      } catch (decErr) {
        console.error("[Login Decrypt Error]", decErr);
        return NextResponse.json({ error: "Gagal mendekripsi kata sandi." }, { status: 400 });
      }
    } else {
      rawPassword = pin || bodyPassword || "";
    }

    const password = rawPassword.trim();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Nomor telepon atau username wajib diisi." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Kata sandi atau PIN wajib diisi." }, { status: 400 });
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
