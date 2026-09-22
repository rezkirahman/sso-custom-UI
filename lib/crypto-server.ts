import crypto from "crypto";

// Singleton RSA-2048 Keypair untuk enkripsi end-to-end payload login di browser
let keyPair: { publicKeyJwk: JsonWebKey; privateKeyPem: string } | null = null;

function getKeyPair() {
  if (!keyPair) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    keyPair = {
      publicKeyJwk: publicKey.export({ format: "jwk" }) as JsonWebKey,
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
    };
  }
  return keyPair;
}

/**
 * Mendapatkan Public Key dalam format JWK untuk digunakan oleh browser Web Crypto API
 */
export function getPublicKeyJwk(): JsonWebKey {
  return getKeyPair().publicKeyJwk;
}

/**
 * Mendekripsi password yang dienkripsi oleh browser dengan RSA-OAEP SHA-256
 */
export function decryptPassword(encryptedBase64: string): string {
  if (!encryptedBase64) return "";
  const { privateKeyPem } = getKeyPair();

  const decrypted = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedBase64, "base64")
  );

  return decrypted.toString("utf-8");
}
