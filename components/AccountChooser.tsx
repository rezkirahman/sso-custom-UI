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
  Trash2,
  Loader2,
  Users,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  MoreVertical,
  LogOut,
} from "lucide-react";

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
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [pinPromptAccount, setPinPromptAccount] = React.useState<SavedAccount | null>(null);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAccountList(accounts);
  }, [accounts]);

  // Tutup menu titik tiga jika user klik di luar
  React.useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      document.addEventListener("click", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeMenuId]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Login 1-klik via Resume Route
  const handleSelectAccount = async (account: SavedAccount) => {
    // Jika sesi sudah tidak ada di akun ini, langsung minta kata sandi
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pinPromptAccount.phone || pinPromptAccount.username,
          password: cleanPassword,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Kata sandi yang dimasukkan salah.");
        setLoadingId(null);
        return;
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

  // Eksekusi aksi dari Menu Titik Tiga (Logout atau Hapus)
  const handleMenuAction = async (
    e: React.MouseEvent,
    account: SavedAccount,
    action: "logout" | "remove"
  ) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setLoadingId(account.id);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (action === "remove") {
          const updated = accountList.filter((a) => a.id !== account.id);
          setAccountList(updated);
          onAccountsUpdated?.(updated);
          if (updated.length === 0) {
            onUseAnotherAccount();
          }
        } else {
          // Action logout: tandai sesi akun ini sudah tidak aktif
          const updated = accountList.map((a) => {
            if (a.id === account.id) {
              const copy = { ...a };
              delete copy.sessionId;
              delete copy.sessionToken;
              return copy;
            }
            return a;
          });
          setAccountList(updated);
          onAccountsUpdated?.(updated);
        }
      }
    } catch (err) {
      console.error("Gagal melakukan aksi:", err);
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

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
            const isMenuOpen = activeMenuId === account.id;
            const hasActiveSession = !!account.sessionId;

            return (
              <div
                key={account.id}
                onClick={() => handleSelectAccount(account)}
                className={`relative group flex items-center justify-between p-3.5 rounded-xl border border-border/70 transition-all cursor-pointer ${
                  isLoading
                    ? "bg-primary/5 border-primary/40 pointer-events-none"
                    : "hover:bg-accent/60 hover:border-primary/40 active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10 text-primary font-semibold shrink-0">
                    <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {account.displayName}
                      </p>
                      {hasActiveSession ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Sesi Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full border border-border/50">
                          Keluar
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {account.phone || account.username}
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Menu Titik Tiga (Dropdown) */}
                <div className="relative ml-2 shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : account.id);
                      }}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors ${
                        isMenuOpen ? "bg-muted text-foreground" : ""
                      }`}
                      title="Menu Opsi Akun"
                      aria-label="Opsi Akun"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  )}

                  {/* Dropdown Menu Popover */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border/80 bg-popover p-1.5 shadow-lg shadow-black/10 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {hasActiveSession && (
                        <button
                          type="button"
                          onClick={(e) => handleMenuAction(e, account, "logout")}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-accent transition-colors text-left"
                        >
                          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Keluar dari Sesi</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleMenuAction(e, account, "remove")}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        <span>Hapus dari Perangkat</span>
                      </button>
                    </div>
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
