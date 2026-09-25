export const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
export const ZITADEL_PAT = process.env.ZITADEL_PAT || "";
export const ZITADEL_KEY_BASE64 = process.env.ZITADEL_KEY_BASE64 || "";

export const FALLBACK_USERS = [
  { id: "usr_01", username: "doni", displayName: "Doni (Agforce)", phone: "+6281234567890", avatarUrl: "https://i.pravatar.cc/150?u=doni" },
  { id: "usr_02", username: "sarah", displayName: "Sarah (Dexter)", phone: "+6289876543210", avatarUrl: "https://i.pravatar.cc/150?u=sarah" },
];

export interface ZitadelUser {
  id: string;
  username: string;
  displayName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
}

export interface VerifyPinResult {
  success: boolean;
  sessionId?: string;
  sessionToken?: string;
  error?: string;
}

export interface FinalizeAuthResult {
  success: boolean;
  callbackUrl?: string;
}

export interface ZitadelKeyJson {
  type: string;
  keyId: string;
  key: string;
  userId: string;
}
