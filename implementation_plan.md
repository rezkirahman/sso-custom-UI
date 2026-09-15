# IMPLEMENTATION PLAN: STANDALONE AGFORCE ACCOUNTS PORTAL
**Domain Target:** `accounts.agforce.co.id`  
**Direktori Project:** `C:\AIGN\sso-accounts-ui`  
**Backend SSO Engine:** ZITADEL Session API (`https://sso-dev.agforce.co.id`)  
**UI Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (`--preset b311momZs0`)

---

## 1. Ringkasan Proyek
Membangun web portal login mandiri (*standalone*) untuk seluruh ekosistem aplikasi Agforce (Dexter, Venturis, Sixzense).
- **Format:** Halaman web penuh (*Page Redirect*), responsif di desktop maupun smartphone.
- **Tampilan:** Menggunakan preset resmi **shadcn/ui `--preset b311momZs0`** tanpa modifikasi tema manual.
- **Fitur Utama:**
  1. **Layar Pilih Akun (Account Chooser):** Menampilkan daftar akun yang pernah login di perangkat tersebut (mirip Google Account Chooser) untuk login 1x klik.
  2. **Form Login No. HP & PIN:** Input Nomor Telepon dengan hint `08...` dan 6 kotak PIN terpisah yang otomatis pindah fokus.
  3. **Integrasi ZITADEL Session API v2:** Verifikasi PIN dan penerbitan sesi SSO langsung ke server ZITADEL.

---

## 2. Struktur Folder & File

```
C:\AIGN\sso-accounts-ui\
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts       # Endpoint POST: Verifikasi No. HP & PIN ke ZITADEL
│   │       ├── resume/route.ts      # Endpoint POST: Login instan saat user klik akun tersimpan
│   │       └── logout/route.ts      # Endpoint POST: Bersihkan cookie sesi lokal
│   ├── login/
│   │   └── page.tsx                 # Halaman Login Utama (Otomatis switch Pilih Akun / Form PIN)
│   ├── layout.tsx                   # Root Layout dengan preset shadcn & styling dasar
│   └── page.tsx                     # Redirect otomatis dari root "/" ke "/login"
├── components/
│   ├── AccountChooser.tsx           # UI Daftar Akun Karyawan yang tersimpan
│   ├── PhonePinForm.tsx             # UI Form input Nomor Telepon & PIN
│   ├── PinInput.tsx                 # UI Interaktif 6 Kotak Digit PIN (auto-advance)
│   └── ui/                          # Komponen shadcn murni (Card, Button, Input, Badge, Avatar, Separator)
├── lib/
│   ├── zitadel.ts                   # Client helper server-side untuk ZITADEL Session API v2
│   ├── session-store.ts             # Helper pengelolaan cookie akun lokal
│   └── utils.ts                     # Utility cn() bawaan shadcn
├── .env.local                       # Kredensial SSO ZITADEL
├── package.json
└── tailwind.config.ts
```

---

## 3. Tahapan Eksekusi

### Langkah 1: Inisialisasi Project Next.js
Di direktori `C:\AIGN\sso-accounts-ui`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

### Langkah 2: Setup shadcn/ui dengan Preset Khusus
Menggunakan preset resmi pilihan Anda tanpa modifikasi tema manual:
```bash
npx shadcn@latest init --preset b311momZs0 --yes
npx shadcn@latest add card button input badge avatar separator label
```

### Langkah 3: Konfigurasi Environment (`.env.local`)
```env
ZITADEL_ISSUER="https://sso-dev.agforce.co.id"
ZITADEL_CLIENT_ID="390676713547302915"
ZITADEL_PAT="eyJhbGciOiJBMjU2R0NNS1ciLCJlb..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Langkah 4: Implementasi Helper ZITADEL Session API (`lib/zitadel.ts`)
- `searchUserByPhone(phone)`: Mencari User ID di ZITADEL berdasarkan nomor telepon.
- `verifyUserPin(userId, pin)`: Membuat session dan memverifikasi PIN 6 digit via endpoint `POST /v2/sessions`.
- `finalizeAuthRequest(sessionId, authRequestId)`: Mengaitkan sesi yang valid dengan request login dari aplikasi klien (Dexter/Venturis).

### Langkah 5: Implementasi Komponen UI
1. **`PinInput.tsx`**: 6 kotak input terpisah dengan validasi angka murni dan auto-focus ke kotak berikutnya.
2. **`PhonePinForm.tsx`**: Form input nomor telepon dan PIN dengan pesan error dalam bahasa Indonesia.
3. **`AccountChooser.tsx`**: Kartu profil akun karyawan yang tersimpan di browser untuk login cepat.
4. **`app/login/page.tsx`**: Controller tampilan yang otomatis mendeteksi apakah ada akun tersimpan atau menampilkan form baru.

---

## 4. Alur Integrasi dengan Aplikasi Satelit (Dexter & Venturis)

1. **User Buka Dexter $\rightarrow$ Klik "Login with Agforce":**
   Dexter mengarahkan user ke:
   `https://accounts.agforce.co.id/login?authRequestID=...`
2. **Halaman `accounts.agforce.co.id`:**
   - Menampilkan kartu *"Pilih Akun"* jika user pernah login sebelumnya, ATAU
   - Menampilkan form *"Nomor Telepon & 6 Kotak PIN"*.
3. **Verifikasi Sukses:**
   Server memvalidasi PIN ke ZITADEL $\rightarrow$ ZITADEL menerbitkan authorization code $\rightarrow$ user diarahkan kembali ke Dashboard Dexter.
4. **User Buka Venturis (SSO Bekerja):**
   Venturis mengarahkan ke `accounts.agforce.co.id` $\rightarrow$ sistem mendeteksi sesi aktif $\rightarrow$ langsung kembali ke Venturis tanpa meminta PIN lagi.

---

## 5. Rencana Pengujian (Verification Plan)

1. **Uji Build & Kompilasi:**
   ```bash
   npm run build
   ```
2. **Uji Fungsional Form:**
   - Jalankan `npm run dev` pada port 3000.
   - Buka halaman login dengan No. HP & PIN salah $\rightarrow$ pastikan muncul pesan error.
   - Buka halaman login dengan No. HP & PIN benar $\rightarrow$ pastikan verifikasi sukses.
3. **Uji Fitur Pilih Akun:**
   - Buka kembali halaman login setelah login pertama $\rightarrow$ pastikan kartu akun tersimpan muncul.
   - Klik akun tersebut $\rightarrow$ pastikan langsung terautentikasi.
