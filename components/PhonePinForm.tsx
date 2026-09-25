"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, ArrowLeft, Loader2, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { encryptPassword } from "@/lib/crypto-client";
import { toast } from "sonner";

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface PhonePinFormProps {
  authRequestId?: string;
  onSuccess?: (callbackUrl: string) => void;
  onBackToChooser?: () => void;
  hasSavedAccounts?: boolean;
}

export function PhonePinForm({
  authRequestId,
  onSuccess,
  onBackToChooser,
  hasSavedAccounts = false,
}: PhonePinFormProps) {
  const [step, setStep] = React.useState<"phone" | "password">("phone");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<{ displayName: string; phone: string } | null>(null);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (step === "phone") {
        phoneInputRef.current?.focus();
      } else if (step === "password") {
        passwordInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      toast.error("Silakan masukkan nomor telepon atau username Anda.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/search?q=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setFoundUser(data.user);
        setStep("password");
        setPassword("");
      } else {
        toast.error(data.error || "Nomor tidak terdaftar");
      }
    } catch {
      toast.error("Gagal terhubung ke server. Silakan periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      toast.error("Silakan masukkan kata sandi atau PIN Anda.");
      return;
    }

    setLoading(true);

    try {
      const encryptedPassword = await encryptPassword(cleanPassword);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone,
          encryptedPassword,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal masuk. Kata sandi salah.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined" && navigator.credentials) {
        try {
          const CredClass = (window as any).PasswordCredential;
          if (CredClass) {
            const cred = new CredClass({
              id: phone,
              password: cleanPassword,
              name: foundUser?.displayName,
            });
            await navigator.credentials.store(cred);
          }
        } catch {
          // Ignore
        }
      }

      toast.success("Login berhasil! Memuat sesi Anda...");

      const targetUrl = data.callbackUrl || "/";
      if (onSuccess) {
        onSuccess(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Terjadi gangguan koneksi ke server. Silakan coba beberapa saat lagi.");
      }
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/60 backdrop-blur-sm bg-card/95 relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 bg-transparent transition-all flex items-start justify-center">
          <div className="h-1 w-full absolute top-0 bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-1/3"></div>
          </div>
        </div>
      )}

      <CardHeader className="space-y-2 text-center pb-4 relative z-0">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {step === "phone" ? "Masuk ke Agforce" : "Masukkan Kata Sandi"}
        </CardTitle>
        <CardDescription className="text-sm">
          {step === "phone"
            ? "Gunakan nomor telepon atau username terdaftar untuk mengakses ekosistem Agforce"
            : foundUser
            ? `Halo, ${foundUser.displayName}! Masukkan kata sandi atau PIN akun Anda`
            : `Masukkan kata sandi atau PIN untuk ${phone}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2 relative z-0">
        {step === "phone" ? (
          <form action="/api/auth/search" method="GET" onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-input" className="text-sm font-medium">
                Nomor Telepon / Username
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <Input
                  id="phone-input"
                  name="username"
                  ref={phoneInputRef}
                  type="text"
                  autoComplete="username"
                  placeholder="Contoh: 081234567890 atau rezki"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                  }}
                  disabled={loading}
                  className="pl-10 h-11 text-base transition-colors focus-visible:ring-primary/40"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Nomor handphone <code>08...</code> atau username karyawan
              </p>
            </div>

            <Button type="submit" disabled={loading || !phone.trim()} className="w-full h-11 font-medium text-base relative overflow-hidden group">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memeriksa Akun...
                </>
              ) : (
                "Lanjutkan"
              )}
            </Button>
          </form>
        ) : (
          <form action="/api/auth/login" method="POST" onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/40">
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10 text-primary font-bold shrink-0">
                  <AvatarFallback>
                    {getInitials(foundUser?.displayName || phone)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {foundUser?.displayName || phone}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {foundUser?.phone || phone}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                }}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                Ganti
              </Button>
            </div>

            <input
              type="text"
              name="username"
              autoComplete="username"
              value={phone}
              className="sr-only"
              tabIndex={-1}
              readOnly
            />

            <div className="space-y-2">
              <Label htmlFor="password-input" className="text-sm font-medium">
                Kata Sandi / PIN
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password-input"
                  name="password"
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi atau PIN Anda"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  disabled={loading}
                  className="pl-10 pr-10 h-11 text-base transition-colors focus-visible:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full h-11 font-medium text-base mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        )}
      </CardContent>

      {hasSavedAccounts && step === "phone" && onBackToChooser && (
        <CardFooter className="pt-2 border-t border-border/50 relative z-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onBackToChooser}
            className="w-full text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Akun
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
