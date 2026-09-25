import crypto from "crypto";
import { ZITADEL_ISSUER, ZITADEL_PAT, ZITADEL_KEY_BASE64, ZitadelKeyJson } from "./config";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getServiceAccountToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  if (ZITADEL_KEY_BASE64) {
    try {
      const keyJson: ZitadelKeyJson = JSON.parse(
        Buffer.from(ZITADEL_KEY_BASE64, "base64").toString("utf-8")
      );

      const b64url = (str: string) => Buffer.from(str).toString("base64url");
      const header = { alg: "RS256", kid: keyJson.keyId, typ: "JWT" };
      const payload = {
        iss: keyJson.userId,
        sub: keyJson.userId,
        aud: ZITADEL_ISSUER,
        iat: now,
        exp: now + 3600,
      };

      const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(input);
      const signature = sign.sign(keyJson.key, "base64url");
      const assertion = `${input}.${signature}`;

      const params = new URLSearchParams();
      params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
      params.append("assertion", assertion);
      params.append("scope", "openid profile email urn:zitadel:iam:org:project:id:zitadel:aud");

      const res = await fetch(`${ZITADEL_ISSUER}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      if (res.ok) {
        const data = await res.json();
        cachedToken = {
          token: data.access_token,
          expiresAt: now + data.expires_in,
        };
        return data.access_token;
      }
    } catch (err) {
      console.error("[Zitadel getServiceAccountToken Exception]", err);
    }
  }

  return ZITADEL_PAT || "";
}
