"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { PhonePinForm } from "@/components/PhonePinForm";
import { AccountChooser } from "@/components/AccountChooser";
import { SavedAccount } from "@/lib/session-store";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { TransitionPanel } from "@/components/ui/transition-panel";
import useMeasure from "react-use-measure";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawRequestId =
    searchParams.get("authRequest") ||
    searchParams.get("requestId") ||
    searchParams.get("authRequestID") ||
    searchParams.get("authRequestId") ||
    searchParams.get("auth_request_id") ||
    undefined;

  // Format ID ZITADEL v2: jika diawali oidc_, hapus prefixnya (misal oidc_V2_xxx -> V2_xxx)
  const authRequestId = rawRequestId ? rawRequestId.replace(/^oidc_/, "") : undefined;

  const [loading, setLoading] = React.useState(true);
  const [savedAccounts, setSavedAccounts] = React.useState<SavedAccount[]>([]);
  const [view, setView] = React.useState<"chooser" | "form">("form");
  const [panelDirection, setPanelDirection] = React.useState(1);
  const [panelRef, panelBounds] = useMeasure();

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
    if (targetUrl && targetUrl !== "/login" && targetUrl !== "/") {
      window.location.href = targetUrl;
    } else {
      window.location.reload();
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
      <div className="flex flex-col items-center justify-center text-center mb-6 space-y-2.5">
        <div className="flex items-center justify-center py-1">
          <Image
            src="/agforce-logo.png"
            alt="Agforce Logo"
            width={180}
            height={90}
            className="h-14 w-auto object-contain drop-shadow-sm rounded-lg"
            priority
          />
        </div>
        {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Agforce Identity Portal</span>
        </div> */}
        
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
          Agforce Accounts
        </h1>
      </div>

      {/* Main View: Account Chooser atau Form PIN */}
      <div className="w-full max-w-md relative">
        <TransitionPanel
          activeIndex={view === "chooser" && savedAccounts.length > 0 ? 0 : 1}
          custom={panelDirection}
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          variants={{
            enter: (direction) => ({
              x: direction > 0 ? (panelBounds.width || 448) : -(panelBounds.width || 448),
              opacity: 0,
              height: panelBounds.height > 0 ? panelBounds.height : "auto",
              position: "initial",
            }),
            center: {
              zIndex: 1,
              x: 0,
              opacity: 1,
              height: panelBounds.height > 0 ? panelBounds.height : "auto",
            },
            exit: (direction) => ({
              zIndex: 0,
              x: direction < 0 ? (panelBounds.width || 448) : -(panelBounds.width || 448),
              opacity: 0,
              position: "absolute",
              top: 0,
              width: "100%",
            }),
          }}
        >
          <div key="chooser-panel" ref={panelRef} className="w-full">
            <AccountChooser
              accounts={savedAccounts}
              authRequestId={authRequestId}
              onUseAnotherAccount={() => {
                setPanelDirection(1);
                setView("form");
              }}
              onSuccess={handleSuccess}
              onAccountsUpdated={(updated) => setSavedAccounts(updated)}
            />
          </div>

          <div key="form-panel" ref={panelRef} className="w-full">
            <PhonePinForm
              authRequestId={authRequestId}
              onSuccess={handleSuccess}
              onBackToChooser={() => {
                setPanelDirection(-1);
                setView("chooser");
              }}
              hasSavedAccounts={savedAccounts.length > 0}
            />
          </div>
        </TransitionPanel>
      </div>

      {/* Footer Security Badges */}
      <div className="mt-8 flex flex-col items-center space-y-2 text-xs text-muted-foreground text-center">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground/80" />
          <span>Koneksi aman terenkripsi TLS 1.3 &bull; Agforce Identity Service</span>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Agforce. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-background/95 to-muted/20 overflow-x-hidden">
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
