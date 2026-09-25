import { NextRequest, NextResponse } from "next/server";
import { searchUserByPhone } from "@/lib/zitadel";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ERROR_MESSAGES } from "@/lib/constants/errors";

const searchSchema = z.object({
  q: z.string().min(1, "Query pencarian diperlukan").max(100, "Query terlalu panjang"),
});

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "search", { limit: 50, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.TOO_MANY_REQUESTS },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const parseResult = searchSchema.safeParse({ q: searchParams.get("q") || "" });

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || "Payload tidak valid" }, { status: 400 });
    }

    const { q } = parseResult.data;

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
