"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowLeft, Loader2, ShieldCheck, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";

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
  const [error, setError] = React.useState<string | null>(null);
  const [foundUser, setFoundUser] = React.useState<{ displayName: string; phone: string } | null>(null);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (step === "phone") {
      phoneInputRef.current?.focus();
    } else if (step === "password") {
      passwordInputRef.current?.focus();
    }
  }, [step]);

  // Langkah 1: Validasi format & cek nomor telepon
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError("Silakan masukkan nomor telepon atau username Anda.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/search?q=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();

      if (!res.ok || !data.user) {
        setError(data.error || "Nomor telepon atau username tidak terdaftar sebagai karyawan Agforce.");
        setLoading(false);
        return;
      }

      setFoundUser(data.user);
      setStep("password");
    } catch {
      setStep("password");
    } finally {
      setLoading(false);
    }
  };

  // Langkah 2: Submit verifikasi Password / PIN
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setError("Silakan masukkan kata sandi atau PIN Anda.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          password: cleanPassword,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Kata sandi atau PIN salah. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      // Login berhasil, alihkan
      const targetUrl = data.callbackUrl || "/";
      if (onSuccess) {
        onSuccess(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    } catch {
      setError("Terjadi gangguan koneksi ke server. Silakan coba beberapa saat lagi.");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-2 text-center pb-4">
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

      <CardContent className="space-y-4 pt-2">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                  ref={phoneInputRef}
                  type="text"
                  autoComplete="username tel"
                  placeholder="Contoh: 081234567890 atau rezki"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className="pl-10 h-11 text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Nomor handphone <code>08...</code> atau username karyawan
              </p>
            </div>

            <Button type="submit" disabled={loading || !phone.trim()} className="w-full h-11 font-medium text-base">
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
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-input" className="text-sm font-medium">
                  Kata Sandi / PIN
                </Label>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password-input"
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi atau PIN Anda"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className="pl-10 pr-10 h-11 text-base"
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

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setPassword("");
                setError(null);
              }}
              disabled={loading}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 pt-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Ganti akun atau nomor telepon</span>
            </button>
          </form>
        )}
      </CardContent>

      {hasSavedAccounts && step === "phone" && onBackToChooser && (
        <CardFooter className="pt-2 border-t border-border/50">
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
