"use client";

let cachedCryptoKey: CryptoKey | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function getClientEncryptionKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }

  const res = await fetch("/api/auth/public-key");
  if (!res.ok) {
    throw new Error("Gagal mengambil kunci enkripsi dari server");
  }

  const data = await res.json();
  const jwk = data.publicKey;

  const cryptoKey = await window.crypto.subtle.importKey(
    "jwk",
    { ...jwk, alg: "RSA-OAEP-256", key_ops: ["encrypt"] },
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  cachedCryptoKey = cryptoKey;
  return cryptoKey;
}

/**
 * Mengenkripsi password/PIN di sisi browser sebelum dikirim melalui jaringan (DevTools payload tidak melihat plaintext)
 */
export async function encryptPassword(password: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Enkripsi hanya dapat dilakukan di browser.");
  }

  if (!window.crypto?.subtle) {
    throw new Error("Browser tidak mendukung enkripsi atau koneksi tidak aman (HTTPS diperlukan).");
  }

  try {
    const key = await getClientEncryptionKey();
    const encoded = new TextEncoder().encode(password);
    const cipherBuffer = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
    return arrayBufferToBase64(cipherBuffer);
  } catch (err) {
    console.error("[Client Encryption Error]", err);
    throw new Error("Gagal mengenkripsi kata sandi. Pastikan koneksi aman.");
  }
}
