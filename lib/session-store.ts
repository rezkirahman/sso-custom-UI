import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export interface SavedAccount {
  id: string;
  displayName: string;
  phone: string;
  username: string;
  lastLoginAt: number;
  avatarUrl?: string;
  sessionId?: string;
  sessionToken?: string;
}

const SAVED_ACCOUNTS_COOKIE = "agforce_saved_accounts";
const ACTIVE_SESSION_COOKIE = "agforce_active_session";

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fallback rahasia default HANYA untuk development, akan melempar peringatan
    console.warn("⚠️ [SECURITY WARNING] SESSION_SECRET tidak ditemukan atau kurang dari 32 karakter! Menggunakan secret default. JANGAN gunakan ini di production!");
    return "agforce_default_secret_password_32_chars_min!";
  }
  return secret;
}

/**
 * Mengambil daftar akun yang tersimpan dari cookie di server
 */
export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SAVED_ACCOUNTS_COOKIE)?.value;
  if (!raw) return [];
  
  try {
    const unsealed = await unsealData<SavedAccount[]>(raw, { password: getSessionPassword() });
    if (Array.isArray(unsealed)) {
      return unsealed.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    }
  } catch (err) {
    // Fallback parsing plaintext jika cookie sebelumnya belum dienkripsi (masa transisi)
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
      }
    } catch {
      console.error("Gagal decrypt/parse cookie saved accounts:", err);
    }
  }
  return [];
}

/**
 * Menyimpan / memperbarui profil akun di daftar saved accounts
 */
export async function saveAccount(account: Omit<SavedAccount, "lastLoginAt">): Promise<SavedAccount[]> {
  const accounts = await getSavedAccounts();
  const existingIdx = accounts.findIndex((a) => a.id === account.id || a.phone === account.phone);

  const updatedAccount: SavedAccount = {
    ...account,
    lastLoginAt: Date.now(),
  };

  if (existingIdx >= 0) {
    accounts[existingIdx] = updatedAccount;
  } else {
    accounts.unshift(updatedAccount);
  }

  // Maksimal simpan 5 akun terakhir
  const trimmed = accounts.slice(0, 5);
  const encrypted = await sealData(trimmed, { password: getSessionPassword() });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SAVED_ACCOUNTS_COOKIE,
    value: encrypted,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });

  return trimmed;
}

/**
 * Menghapus akun tertentu dari daftar tersimpan
 */
export async function removeSavedAccount(accountId: string): Promise<SavedAccount[]> {
  const accounts = await getSavedAccounts();
  const filtered = accounts.filter((a) => a.id !== accountId);
  const encrypted = await sealData(filtered, { password: getSessionPassword() });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SAVED_ACCOUNTS_COOKIE,
    value: encrypted,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return filtered;
}

/**
 * Mengambil sesi aktif saat ini
 */
export async function getActiveSession(): Promise<{ sessionId: string; userId: string; token?: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_SESSION_COOKIE)?.value;
  if (!raw) return null;
  
  try {
    return await unsealData(raw, { password: getSessionPassword() });
  } catch {
    // Fallback parsing plaintext masa transisi
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

/**
 * Menyimpan sesi aktif ke cookie
 */
export async function setActiveSession(data: { sessionId: string; userId: string; token?: string }): Promise<void> {
  const encrypted = await sealData(data, { password: getSessionPassword() });
  const cookieStore = await cookies();
  cookieStore.set({
    name: ACTIVE_SESSION_COOKIE,
    value: encrypted,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 jam
  });
}

/**
 * Menghapus sesi aktif (Logout)
 */
export async function clearActiveSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_SESSION_COOKIE);
}

/**
 * Mengosongkan session dari akun tertentu (Logout akun) tanpa menghapusnya dari daftar perangkat
 */
export async function clearAccountSession(accountId: string): Promise<SavedAccount[]> {
  const accounts = await getSavedAccounts();
  const updated = accounts.map((a) => {
    if (a.id === accountId) {
      const copy = { ...a };
      delete copy.sessionId;
      delete copy.sessionToken;
      return copy;
    }
    return a;
  });

  const encrypted = await sealData(updated, { password: getSessionPassword() });
  const cookieStore = await cookies();
  cookieStore.set({
    name: SAVED_ACCOUNTS_COOKIE,
    value: encrypted,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  const active = await getActiveSession();
  if (active?.userId === accountId) {
    await clearActiveSession();
  }

  return updated;
}
