"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/PinInput";
import { Phone, ArrowLeft, Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

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
  const [step, setStep] = React.useState<"phone" | "pin">("phone");
  const [phone, setPhone] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [maskPin, setMaskPin] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [foundUser, setFoundUser] = React.useState<{ displayName: string; phone: string } | null>(null);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (step === "phone") {
      phoneInputRef.current?.focus();
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
      // Validasi nomor via API pencarian
      const res = await fetch(`/api/auth/search?q=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();

      if (!res.ok || !data.user) {
        setError(data.error || "Nomor telepon tidak terdaftar sebagai karyawan Agforce.");
        setLoading(false);
        return;
      }

      setFoundUser(data.user);
      setStep("pin");
    } catch {
      // Jika endpoint search tidak tersedia, lanjut ke langkah PIN
      setStep("pin");
    } finally {
      setLoading(false);
    }
  };

  // Langkah 2: Submit verifikasi PIN
  const handlePinSubmit = async (finalPin?: string) => {
    const pinToVerify = finalPin || pin;
    if (pinToVerify.length !== 6) {
      setError("PIN harus terdiri dari 6 digit angka.");
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
          pin: pinToVerify,
          authRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Verifikasi gagal. Silakan coba lagi.");
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
          {step === "phone" ? "Masuk ke Agforce" : "Verifikasi PIN"}
        </CardTitle>
        <CardDescription className="text-sm">
          {step === "phone"
            ? "Gunakan nomor telepon terdaftar untuk mengakses seluruh aplikasi ekosistem Agforce"
            : foundUser
            ? `Halo, ${foundUser.displayName}! Masukkan 6 digit PIN keamanan akun Anda`
            : `Masukkan 6 digit PIN untuk nomor ${phone}`}
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
                  autoComplete="tel"
                  placeholder="Contoh: 081234567890"
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
                Format: <code>08...</code> atau username karyawan
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
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">6 Digit PIN</Label>
                <button
                  type="button"
                  onClick={() => setMaskPin(!maskPin)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {maskPin ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{maskPin ? "Tampilkan PIN" : "Sembunyikan"}</span>
                </button>
              </div>

              <PinInput
                length={6}
                value={pin}
                onChange={(val) => {
                  setPin(val);
                  if (error) setError(null);
                }}
                onComplete={(finalPin) => {
                  handlePinSubmit(finalPin);
                }}
                disabled={loading}
                hasError={!!error}
                mask={maskPin}
              />
            </div>

            <Button
              type="button"
              onClick={() => handlePinSubmit()}
              disabled={loading || pin.length !== 6}
              className="w-full h-11 font-medium text-base mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi PIN...
                </>
              ) : (
                "Masuk"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setPin("");
                setError(null);
              }}
              disabled={loading}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 pt-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Ganti nomor telepon</span>
            </button>
          </div>
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
