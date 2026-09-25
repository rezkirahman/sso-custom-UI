"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SavedAccount } from "@/lib/session-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Loader2,
  Users,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogOut,
} from "lucide-react";
import { encryptPassword } from "@/lib/crypto-client";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { TransitionPanel } from "@/components/ui/transition-panel";
import useMeasure from "react-use-measure";

// Helper untuk memformat nomor HP
function formatIndonesianPhone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const hasPlus = value.startsWith("+");
  if (hasPlus && digits.startsWith("62")) {
    const country = digits.substring(0, 2);
    const p1 = digits.substring(2, 5);
    const p2 = digits.substring(5, 9);
    const p3 = digits.substring(9, 14);
    let res = `+${country}`;
    if (p1) res += ` ${p1}`;
    if (p2) res += `-${p2}`;
    if (p3) res += `-${p3}`;
    return res;
  } else {
    const p1 = digits.substring(0, 4);
    const p2 = digits.substring(4, 8);
    const p3 = digits.substring(8, 14);
    let res = p1;
    if (p2) res += `-${p2}`;
    if (p3) res += `-${p3}`;
    return hasPlus ? `+${res}` : res;
  }
}

interface AccountChooserProps {
  accounts: SavedAccount[];
  authRequestId?: string;
  onUseAnotherAccount: () => void;
  onSuccess?: (callbackUrl: string) => void;
  onAccountsUpdated?: (updated: SavedAccount[]) => void;
}

export function AccountChooser({
  accounts,
  authRequestId,
  onUseAnotherAccount,
  onSuccess,
  onAccountsUpdated,
}: AccountChooserProps) {
  const [accountList, setAccountList] = React.useState<SavedAccount[]>(accounts);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [pinPromptAccount, setPinPromptAccount] = React.useState<SavedAccount | null>(null);
  const [direction, setDirection] = React.useState(1);
  const [ref, bounds] = useMeasure();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAccountList(accounts);
  }, [accounts]);

  // Autofocus PIN form when account is selected for re-authentication
  React.useEffect(() => {
    if (pinPromptAccount) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pinPromptAccount]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSelectAccount = async (account: SavedAccount) => {
    if (!account.sessionId) {
      setDirection(1);
      setPinPromptAccount(account);
      setPassword("");
      return;
    }

    setLoadingId(account.id);

    try {
      const res = await fetch("/api/auth/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: account.id,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Selamat datang kembali, ${account.displayName}!`);
        const targetUrl = data.callbackUrl || "/login";
        if (onSuccess) {
          onSuccess(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
        return;
      }

      if (data.requirePin || res.status === 404) {
        toast.info("Sesi telah kedaluwarsa. Silakan masukkan PIN kembali.");
        setDirection(1);
        setPinPromptAccount(account);
        setPassword("");
      } else {
        toast.error(data.error || "Gagal masuk dengan akun ini.");
      }
    } catch {
      toast.error("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinPromptAccount) return;
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      toast.error("Silakan masukkan kata sandi Anda.");
      return;
    }

    setLoadingId(pinPromptAccount.id);

    try {
      const encryptedPassword = await encryptPassword(cleanPassword);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pinPromptAccount.phone || pinPromptAccount.username,
          encryptedPassword,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Kata sandi yang dimasukkan salah.");
        setLoadingId(null);
        return;
      }

      toast.success("Login berhasil!");
      
      if (typeof window !== "undefined" && navigator.credentials) {
        try {
          const CredClass = (window as any).PasswordCredential;
          if (CredClass) {
            const cred = new CredClass({
              id: pinPromptAccount.phone || pinPromptAccount.username,
              password: cleanPassword,
              name: pinPromptAccount.displayName,
            });
            await navigator.credentials.store(cred);
          }
        } catch {
          // Abaikan
        }
      }

      const targetUrl = data.callbackUrl || "/login";
      if (onSuccess) {
        onSuccess(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    } catch {
      toast.error("Terjadi gangguan koneksi ke server.");
      setLoadingId(null);
    }
  };

  const handleDirectLogout = async (e: React.MouseEvent, account: SavedAccount) => {
    e.stopPropagation();
    setLoadingId(account.id);
    
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          action: "remove" 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccountList(data.accounts);
        toast.success("Akun berhasil dihapus dari perangkat ini.");
        if (onAccountsUpdated) {
          onAccountsUpdated(data.accounts);
        }
      }
    } catch {
      toast.error("Gagal menghapus akun.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border border-border/80 bg-card relative overflow-hidden py-0 gap-0">
      <TransitionPanel
        activeIndex={pinPromptAccount ? 1 : 0}
        custom={direction}
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        variants={{
          enter: (direction) => ({
            x: direction > 0 ? (bounds.width || 448) : -(bounds.width || 448),
            opacity: 0,
            height: bounds.height > 0 ? bounds.height : "auto",
            position: "initial",
          }),
          center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            height: bounds.height > 0 ? bounds.height : "auto",
          },
          exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? (bounds.width || 448) : -(bounds.width || 448),
            opacity: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }),
        }}
      >
        <div key="account-list-panel" ref={ref} className="p-6 space-y-4">
          <div className="space-y-2 text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Pilih Akun</h2>
            <p className="text-sm text-muted-foreground">
              Pilih akun Anda yang tersimpan untuk masuk ke Agforce
            </p>
          </div>

          <div className="space-y-2">
            {accountList.map((account) => {
              const isLoading = loadingId === account.id;
              const needsPin = !account.sessionId;

              return (
                <div
                  key={account.id}
                  className="group flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background hover:bg-muted/40 transition-colors shadow-sm"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer mr-2"
                    onClick={() => handleSelectAccount(account)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectAccount(account);
                      }
                    }}
                  >
                    <Avatar className="h-11 w-11 border border-primary/20 bg-primary/10 text-primary font-bold shadow-sm">
                      <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {account.displayName}
                        </p>
                        {needsPin ? (
                          <div className="flex h-4 items-center rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground" title="Memerlukan PIN">
                            <Lock className="h-3 w-3 mr-0.5" /> PIN
                          </div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm" title="Sesi Aktif" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {formatIndonesianPhone(account.phone || account.username || "")}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDirectLogout(e, account)}
                        className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
                        title="Keluar"
                        aria-label="Keluar"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onUseAnotherAccount}
            className="w-full h-11 border-dashed font-medium text-sm flex items-center justify-center gap-2 mt-2 hover:bg-muted/50 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Gunakan Akun Lain
          </Button>

          <div className="flex items-center justify-center border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <span>{accountList.length} akun tersimpan di perangkat ini</span>
          </div>
        </div>

        <div key="pin-prompt-panel" ref={ref} className="p-6 space-y-4">
          <div className="space-y-2 text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg mb-1 shadow-sm">
              {pinPromptAccount ? getInitials(pinPromptAccount.displayName) : "U"}
            </div>
            <h2 className="text-xl font-bold">{pinPromptAccount?.displayName}</h2>
            <p className="text-sm text-muted-foreground">
              {formatIndonesianPhone(pinPromptAccount?.phone || pinPromptAccount?.username || "")}
            </p>
          </div>

          <form action="/api/auth/login" method="POST" onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={pinPromptAccount?.phone || pinPromptAccount?.username || ""}
              className="sr-only"
              tabIndex={-1}
              readOnly
            />

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Label htmlFor="account-password-input" className="text-sm font-medium text-center w-full">
                  PIN Keamanan (6 Angka)
                </Label>
              </div>
              <div className="flex justify-center w-full pb-1">
                <InputOTP
                  id="account-password-input"
                  name="password"
                  maxLength={6}
                  value={password}
                  onChange={(val) => setPassword(val)}
                  disabled={loadingId === pinPromptAccount?.id}
                  ref={passwordInputRef as any}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-2xl" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-2xl" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-2xl" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-2xl" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-2xl" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-2xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              type="submit"
              disabled={(loadingId === pinPromptAccount?.id) || !password.trim()}
              className="w-full h-11 font-medium text-base relative overflow-hidden"
            >
              {loadingId === pinPromptAccount?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Lanjutkan"
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDirection(-1);
                setPinPromptAccount(null);
                setPassword("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Pilihan Akun
            </Button>
          </div>
        </div>
      </TransitionPanel>
    </Card>
  );
}
