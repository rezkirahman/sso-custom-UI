import { expect, test, describe } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Security Scenarios", () => {
  // Scenario 2: Cek penolakan Raw PIN
  test("Menolak request login yang menggunakan PIN teks biasa (tanpa enkripsi)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "081234567890", pin: "123456" }), // Mengirim PIN biasa
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toInclude("Koneksi tidak aman. Kata sandi harus dienkripsi");
  });

  // Scenario 3: Cek Account Takeover (Partial Search Match)
  test("Mencegah kebocoran data dengan pencarian parsial (Account Takeover)", async () => {
    // Angka 1234 pasti ada di beberapa nomor (misal 081234...), 
    // jika rentan, ini akan mengembalikan profil acak.
    const res = await fetch(`${BASE_URL}/api/auth/search?q=1234`);
    
    // Harus Not Found karena tidak ada user dengan nomor/username "1234" (harus exact)
    expect(res.status).toBe(404);
  });

  // Scenario 4: Cek Clickjacking Headers
  test("Mengembalikan HTTP Security Headers anti-Clickjacking", async () => {
    const res = await fetch(`${BASE_URL}/login`);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toInclude("max-age=31536000");
  });

  // Scenario 1: Rate Limiting
  test("Mencegah Brute Force & Enumeration (Rate Limiting 429)", async () => {
    let lastStatus = 200;
    
    // Tembak endpoint search 25x berturut-turut (Batas 20x per 10 menit)
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/search?q=081234567890`);
      lastStatus = res.status;
    }
    
    // Status terakhir HARUS 429 Too Many Requests
    expect(lastStatus).toBe(429);
  }, 10000); // timeout 10s
});
