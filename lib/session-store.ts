import { cookies } from "next/headers";

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

/**
 * Mengambil daftar akun yang tersimpan dari cookie di server
 */
export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SAVED_ACCOUNTS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    }
  } catch (err) {
    console.error("Gagal parse cookie saved accounts:", err);
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

  const cookieStore = await cookies();
  cookieStore.set({
    name: SAVED_ACCOUNTS_COOKIE,
    value: encodeURIComponent(JSON.stringify(trimmed)),
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

  const cookieStore = await cookies();
  cookieStore.set({
    name: SAVED_ACCOUNTS_COOKIE,
    value: encodeURIComponent(JSON.stringify(filtered)),
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
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * Menyimpan sesi aktif ke cookie
 */
export async function setActiveSession(data: { sessionId: string; userId: string; token?: string }): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ACTIVE_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(data)),
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
