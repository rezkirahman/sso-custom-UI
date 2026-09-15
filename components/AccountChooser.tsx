"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SavedAccount } from "@/lib/session-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, ArrowRight, Loader2, Users, AlertCircle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";

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
  const [pin, setPin] = React.useState("");
  const [maskPin, setMaskPin] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isManaging, setIsManaging] = React.useState(false);

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
    if (isManaging) return;

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
        const targetUrl = data.callbackUrl || "/";
        if (onSuccess) {
          onSuccess(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
        return;
      }

      // Jika server meminta PIN (misal sesi expired)
      if (data.requirePin || res.status === 404) {
        setPinPromptAccount(account);
        setPin("");
      } else {
        setError(data.error || "Gagal masuk dengan akun ini.");
      }
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoadingId(null);
    }
  };

  // Submit Kata Sandi / PIN untuk akun tertentu
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinPromptAccount) return;
    const pinToVerify = pin.trim();

    if (!pinToVerify) {
      setError("Silakan masukkan kata sandi atau PIN Anda.");
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
          pin: pinToVerify,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "PIN yang dimasukkan salah.");
        setLoadingId(null);
        return;
      }

      const targetUrl = data.callbackUrl || "/";
      if (onSuccess) {
        onSuccess(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    } catch {
      setError("Terjadi gangguan jaringan saat verifikasi PIN.");
      setLoadingId(null);
    }
  };

  // Hapus akun tersimpan
  const handleRemoveAccount = async (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/auth/saved-accounts?id=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = accountList.filter((a) => a.id !== accountId);
        setAccountList(updated);
        onAccountsUpdated?.(updated);
        if (updated.length === 0) {
          onUseAnotherAccount();
        }
      }
    } catch (err) {
      console.error("Gagal menghapus akun:", err);
    }
  };

  // Jika akun meminta konfirmasi PIN
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

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-password-input" className="text-sm font-medium">
                Kata Sandi / PIN
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="account-password-input"
                  type={maskPin ? "password" : "text"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi atau PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={!!loadingId}
                  className="pl-10 pr-10 h-11 text-base"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMaskPin(!maskPin)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {maskPin ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!!loadingId || !pin.trim()}
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
              setPin("");
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
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10 text-primary font-semibold">
                    <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {account.displayName}
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        Karyawan
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.phone || account.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : isManaging ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAccount(e, account.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Hapus dari daftar perangkat ini"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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

      <CardFooter className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span>{accountList.length} akun tersimpan</span>
        <button
          type="button"
          onClick={() => setIsManaging(!isManaging)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {isManaging ? "Selesai" : "Kelola Akun"}
        </button>
      </CardFooter>
    </Card>
  );
}
