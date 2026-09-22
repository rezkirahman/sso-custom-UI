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
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogOut,
} from "lucide-react";
import { encryptPassword } from "@/lib/crypto-client";

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
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAccountList(accounts);
  }, [accounts]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Login 1-klik via Resume Route
  const handleSelectAccount = async (account: SavedAccount) => {
    // Jika sesi sudah tidak ada di akun ini, minta kata sandi
    if (!account.sessionId) {
      setPinPromptAccount(account);
      setPassword("");
      return;
    }

    setLoadingId(account.id);
    setError(null);

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
        const targetUrl = data.callbackUrl || "/login";
        if (onSuccess) {
          onSuccess(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
        return;
      }

      // Jika server meminta login ulang (misal sesi expired di ZITADEL)
      if (data.requirePin || res.status === 404) {
        setPinPromptAccount(account);
        setPassword("");
      } else {
        setError(data.error || "Gagal masuk dengan akun ini.");
      }
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoadingId(null);
    }
  };

  // Submit Kata Sandi untuk akun tertentu
  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinPromptAccount) return;
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError("Silakan masukkan kata sandi Anda.");
      return;
    }

    setLoadingId(pinPromptAccount.id);
    setError(null);

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
        setError(data.error || "Kata sandi yang dimasukkan salah.");
        setLoadingId(null);
        return;
      }

      // Simpan kredensial ke browser password manager jika didukung
      if (typeof window !== "undefined" && "PasswordCredential" in window && navigator.credentials) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // Abaikan jika browser membatasi atau user membatalkan
        }
      }

      const targetUrl = data.callbackUrl || "/login";
      if (onSuccess) {
        onSuccess(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    } catch {
      setError("Terjadi gangguan jaringan saat verifikasi.");
      setLoadingId(null);
    }
  };

  // 1-Klik Keluar & Hapus Sesi ke ZITADEL
  const handleDirectLogout = async (e: React.MouseEvent, account: SavedAccount) => {
    e.stopPropagation();
    setLoadingId(account.id);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          action: "remove",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated = accountList.filter((a) => a.id !== account.id);
        setAccountList(updated);
        onAccountsUpdated?.(updated);
        if (updated.length === 0) {
          onUseAnotherAccount();
        }
      }
    } catch (err) {
      console.error("Gagal keluar:", err);
    } finally {
      setLoadingId(null);
    }
  };

  // Jika akun meminta konfirmasi kata sandi
  if (pinPromptAccount) {
    return (
      <Card className="w-full max-w-md shadow-xl border-border/60 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-2 text-center pb-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg mb-1">
            {getInitials(pinPromptAccount.displayName)}
          </div>
          <CardTitle className="text-xl font-bold">{pinPromptAccount.displayName}</CardTitle>
          <CardDescription className="text-sm">
            {pinPromptAccount.phone || pinPromptAccount.username}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form action="/api/auth/login" method="POST" onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Input username tersembunyi untuk browser password manager */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={pinPromptAccount.phone || pinPromptAccount.username}
              className="sr-only"
              tabIndex={-1}
              readOnly
            />

            <div className="space-y-2">
              <Label htmlFor="account-password-input" className="text-sm font-medium">
                Kata Sandi
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="account-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi akun Anda"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={!!loadingId}
                  className="pl-10 pr-10 h-11 text-base"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!!loadingId || !password.trim()}
              className="w-full h-11 font-medium text-base mt-2"
            >
              {loadingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Lanjutkan Masuk"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border/50 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPinPromptAccount(null);
              setPassword("");
              setError(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Pilihan Akun
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-2 text-center pb-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <Users className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Pilih Akun</CardTitle>
        <CardDescription className="text-sm">
          Pilih salah satu akun terdaftar di perangkat ini untuk melanjutkan ke aplikasi Agforce
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Daftar Akun */}
        <div className="space-y-2">
          {accountList.map((account) => {
            const isLoading = loadingId === account.id;
            const hasActiveSession = !!account.sessionId;

            return (
              <div
                key={account.id}
                onClick={() => handleSelectAccount(account)}
                className={`group flex items-center justify-between p-3.5 rounded-xl border border-border/70 transition-all cursor-pointer ${
                  isLoading
                    ? "bg-primary/5 border-primary/40 pointer-events-none"
                    : "hover:bg-accent/60 hover:border-primary/40 active:scale-[0.99]"
                }`}
              >
                {/* Info Akun (Klik untuk Login) */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                  <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10 text-primary font-semibold shrink-0">
                    <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                        {account.displayName}
                      </p>
                      {hasActiveSession && (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 inline-block"
                          title="Sesi Aktif"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {account.phone || account.username}
                    </p>
                  </div>
                </div>

                {/* Tombol Keluar (Logout) */}
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

        {/* Tombol Gunakan Akun Lain */}
        <Button
          type="button"
          variant="outline"
          onClick={onUseAnotherAccount}
          className="w-full h-11 border-dashed font-medium text-sm flex items-center justify-center gap-2 mt-2"
        >
          <UserPlus className="h-4 w-4" />
          Gunakan Akun Lain
        </Button>
      </CardContent>

      <CardFooter className="flex items-center justify-center border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span>{accountList.length} akun tersimpan di perangkat ini</span>
      </CardFooter>
    </Card>
  );
}
