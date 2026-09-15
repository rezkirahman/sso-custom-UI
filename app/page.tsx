import { redirect } from "next/navigation";
import { getActiveSession, getSavedAccounts } from "@/lib/session-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogOut, ExternalLink, Smartphone, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const activeSession = await getActiveSession();

  if (!activeSession) {
    redirect("/login");
  }

  const savedAccounts = await getSavedAccounts();
  const currentAccount = savedAccounts.find((a) => a.id === activeSession.userId) || {
    id: activeSession.userId,
    displayName: "Karyawan Agforce",
    phone: "Tersambung",
    username: "karyawan",
    lastLoginAt: Date.now(),
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const satelliteApps = [
    {
      name: "Dexter",
      description: "Aplikasi Manajemen Operasional Lapangan & Distribusi",
      status: "Tersedia",
      url: "https://dexter.agforce.co.id",
    },
    {
      name: "Venturis",
      description: "Sistem Logistik & Inventaris Terintegrasi",
      status: "Tersedia",
      url: "https://venturis.agforce.co.id",
    },
    {
      name: "Sixzense",
      description: "Dashboard Analitik & Monitoring Sensor IoT",
      status: "Tersedia",
      url: "https://sixzense.agforce.co.id",
    },
    {
      name: "Client Management",
      description: "Portal Administrasi Akun & Izin Pengguna",
      status: "Tersedia",
      url: "http://localhost:3000",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/95 to-muted/20 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">Agforce Accounts</h1>
              <p className="text-xs text-muted-foreground">Portal Single Sign-On Mandiri</p>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST">
            <Button variant="outline" size="sm" type="submit" className="text-xs text-muted-foreground hover:text-destructive gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </Button>
          </form>
        </div>

        {/* Kartu Profil Aktif */}
        <Card className="border-border/60 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/20 bg-primary/10 text-primary font-bold text-xl">
                  <AvatarFallback>{getInitials(currentAccount.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{currentAccount.displayName}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Sesi Aktif
                    </Badge>
                  </div>
                  <CardDescription className="text-sm flex items-center gap-1.5 mt-0.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    {currentAccount.phone || currentAccount.username}
                  </CardDescription>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Terautentikasi SSO</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-1">
            Akun ini memiliki sesi aktif yang otomatis digunakan saat Anda membuka aplikasi ekosistem Agforce tanpa perlu memasukkan PIN kembali.
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-3 flex justify-between text-xs">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Ganti akun / Tambah akun lain &rarr;
            </Link>
            <span className="text-muted-foreground">Session ID: {activeSession.sessionId.substring(0, 12)}...</span>
          </CardFooter>
        </Card>

        {/* Daftar Aplikasi Satelit */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold font-heading px-1">Aplikasi Terhubung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {satelliteApps.map((app) => (
              <Card key={app.name} className="border-border/60 hover:border-primary/40 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{app.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {app.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {app.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-1">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Buka Aplikasi
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
