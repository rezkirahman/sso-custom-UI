import { getServiceAccountToken } from "./auth";
import { ZITADEL_ISSUER, FALLBACK_USERS, ZitadelUser } from "./config";

interface RawZitadelUser {
  id?: string;
  userId?: string;
  preferredLoginName?: string;
  username?: string;
  human?: {
    profile?: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      givenName?: string;
      familyName?: string;
    };
    phone?: {
      phone?: string;
    };
    email?: {
      email?: string;
    };
  };
}

export async function searchUserByPhone(phoneQuery: string): Promise<ZitadelUser | null> {
  const trimmed = phoneQuery.trim();
  const cleanDigits = trimmed.replace(/\D/g, "");

  // Aturan Bisnis: Hanya melayani nomor handphone (minimal 8 angka)
  if (cleanDigits.length < 8) {
    return null;
  }

  const token = await getServiceAccountToken();
  if (token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queries: any[] = [];

      // Cari di field Phone dan Username
      queries.push({ phoneQuery: { phone: cleanDigits, method: "TEXT_FILTER_METHOD_CONTAINS" } });
      queries.push({ userNameQuery: { userName: cleanDigits, method: "TEXT_FILTER_METHOD_CONTAINS" } });
      
      if (cleanDigits.startsWith("0")) {
        queries.push({ phoneQuery: { phone: "+62" + cleanDigits.substring(1), method: "TEXT_FILTER_METHOD_CONTAINS" } });
      } else if (cleanDigits.startsWith("62")) {
        queries.push({ phoneQuery: { phone: "+" + cleanDigits, method: "TEXT_FILTER_METHOD_CONTAINS" } });
        // Jika diketik 628..., cari juga username 08...
        queries.push({ userNameQuery: { userName: "0" + cleanDigits.substring(2), method: "TEXT_FILTER_METHOD_CONTAINS" } });
      }

      const res = await fetch(`${ZITADEL_ISSUER}/v2/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          queries: [{ orQuery: { queries } }],
          query: {
            limit: 10,
            asc: true,
          },
        }),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const rawList: RawZitadelUser[] = data.result || [];

        if (rawList.length > 0) {
          // Filter pencarian: Cocokkan digit baik di phone maupun username ZITADEL
          const found = rawList.find((u) => {
            const uPhone = (u.human?.phone?.phone || "").replace(/\D/g, "");
            const uLogin = (u.preferredLoginName || u.username || "").replace(/\D/g, "");
            
            return cleanDigits.length >= 8 && (uPhone.endsWith(cleanDigits) || uLogin.endsWith(cleanDigits));
          });

          if (!found) {
            return null;
          }

          const profile = found.human?.profile;
          const name =
            profile?.displayName ||
            `${profile?.givenName || profile?.firstName || ""} ${profile?.familyName || profile?.lastName || ""}`.trim() ||
            found.preferredLoginName ||
            found.username ||
            trimmed;

          return {
            id: found.userId || found.id || "",
            username: found.username || trimmed,
            displayName: name,
            phone: found.human?.phone?.phone || found.username || trimmed,
            email: found.human?.email?.email,
          };
        }
      }
    } catch (err) {
      console.warn("[Zitadel searchUser Exception]", err);
    }
  }

  if (!token) {
    const sample = FALLBACK_USERS.find((u) => {
      const uDigits = u.phone.replace(/\D/g, "");
      return (cleanDigits.length >= 8 && uDigits.endsWith(cleanDigits)) || u.username.toLowerCase() === trimmed.toLowerCase();
    });
    return sample || null;
  }

  return null;
}
