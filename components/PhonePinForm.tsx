"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ArrowLeft, Loader2, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { encryptPassword } from "@/lib/crypto-client";
import { toast } from "sonner";
import { TransitionPanel } from "@/components/ui/transition-panel";
import useMeasure from "react-use-measure";

// Helper untuk memformat nomor HP ala WhatsApp (0812-3456-7890 atau +62 812-3456-7890)
function formatIndonesianPhone(value: string): string {
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
  const [direction, setDirection] = React.useState(1);
  const [ref, bounds] = useMeasure();
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
    const cleanPhone = phone.replace(/[^\d+]/g, ""); // Hapus spasi dan strip
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Silakan masukkan nomor handphone Anda yang valid (minimal 8 angka).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/search?q=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setFoundUser(data.user);
        setDirection(1);
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
      const cleanPhone = phone.replace(/[^\d+]/g, "");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
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
              id: cleanPhone,
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
      <TransitionPanel
        activeIndex={step === "phone" ? 0 : 1}
        custom={direction}
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        variants={{
          enter: (direction) => ({
            x: direction > 0 ? (bounds.width || 400) : -(bounds.width || 400),
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
            x: direction < 0 ? (bounds.width || 400) : -(bounds.width || 400),
            opacity: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }),
        }}
      >
        <div key="phone-panel" ref={ref} className="p-6 space-y-4">
          <div className="space-y-2 text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Masuk ke Agforce</h2>
            <p className="text-sm text-muted-foreground">
              Gunakan nomor handphone terdaftar untuk mengakses ekosistem Agforce
            </p>
          </div>

          <form action="/api/auth/search" method="GET" onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-input" className="text-sm font-medium">
                Nomor Handphone
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <Input
                  id="phone-input"
                  name="phone"
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9+\s\-]*"
                  autoComplete="tel"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => {
                    const formattedVal = formatIndonesianPhone(e.target.value);
                    setPhone(formattedVal);
                  }}
                  disabled={loading}
                  className="pl-10 h-11 text-base transition-colors focus-visible:ring-primary/40"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Awali dengan <code>08...</code> atau <code>62...</code>
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

          {hasSavedAccounts && onBackToChooser && (
            <div className="pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                onClick={onBackToChooser}
                className="w-full text-sm font-normal text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Akun
              </Button>
            </div>
          )}
        </div>

        <div key="pin-panel" ref={ref} className="p-6 space-y-4">
          <div className="space-y-2 text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Masukkan Kata Sandi</h2>
            <p className="text-sm text-muted-foreground">
              {foundUser
                ? `Halo, ${foundUser.displayName}! Masukkan kata sandi atau PIN akun Anda`
                : `Masukkan kata sandi atau PIN untuk ${phone}`}
            </p>
          </div>

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
                  setDirection(-1);
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

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Label htmlFor="password-input" className="text-sm font-medium text-center w-full">
                  PIN Keamanan (6 Angka)
                </Label>
              </div>
              <div className="flex justify-center w-full pb-1">
                <InputOTP
                  id="password-input"
                  name="password"
                  maxLength={6}
                  value={password}
                  onChange={(val) => setPassword(val)}
                  disabled={loading}
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
        </div>
      </TransitionPanel>
    </Card>
  );
}
