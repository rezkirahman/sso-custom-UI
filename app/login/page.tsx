"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PhonePinForm } from "@/components/PhonePinForm";
import { AccountChooser } from "@/components/AccountChooser";
import { SavedAccount } from "@/lib/session-store";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const authRequestId =
    searchParams.get("authRequestID") ||
    searchParams.get("authRequestId") ||
    searchParams.get("auth_request_id") ||
    undefined;

  const [loading, setLoading] = React.useState(true);
  const [savedAccounts, setSavedAccounts] = React.useState<SavedAccount[]>([]);
  const [view, setView] = React.useState<"chooser" | "form">("form");

  // Ambil daftar akun tersimpan dari endpoint
  React.useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/auth/saved-accounts");
        if (res.ok) {
          const data = await res.json();
          const accounts: SavedAccount[] = data.accounts || [];
          setSavedAccounts(accounts);
          if (accounts.length > 0) {
            setView("chooser");
          } else {
            setView("form");
          }
        }
      } catch (err) {
        console.error("Gagal memuat akun tersimpan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  const handleSuccess = (targetUrl: string) => {
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat portal akun...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header Branding */}
      <div className="text-center mb-8 space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 tracking-wide uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Agforce SSO Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
          Agforce Accounts
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
          Satu akun untuk seluruh ekosistem: Dexter, Venturis, dan Sixzense.
        </p>
      </div>

      {/* Main View: Account Chooser atau Form PIN */}
      {view === "chooser" && savedAccounts.length > 0 ? (
        <AccountChooser
          accounts={savedAccounts}
          authRequestId={authRequestId}
          onUseAnotherAccount={() => setView("form")}
          onSuccess={handleSuccess}
          onAccountsUpdated={(updated) => setSavedAccounts(updated)}
        />
      ) : (
        <PhonePinForm
          authRequestId={authRequestId}
          onSuccess={handleSuccess}
          onBackToChooser={() => setView("chooser")}
          hasSavedAccounts={savedAccounts.length > 0}
        />
      )}

      {/* Footer Security Badges */}
      <div className="mt-8 flex flex-col items-center space-y-2 text-xs text-muted-foreground text-center">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground/80" />
          <span>Koneksi aman terenkripsi TLS 1.3 &bull; ZITADEL Identity Provider</span>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} PT Agforce Indonesia. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-background/95 to-muted/20">
      <React.Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat halaman login...</p>
          </div>
        }
      >
        <LoginContent />
      </React.Suspense>
    </main>
  );
}
