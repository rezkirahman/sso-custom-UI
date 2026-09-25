export const ERROR_MESSAGES = {
  INSECURE_CONNECTION: "Koneksi tidak aman. Kata sandi harus dienkripsi (TLS/Crypto).",
  MISSING_CREDENTIALS: "Kata sandi atau PIN wajib diisi.",
  INVALID_CREDENTIALS: "Kata sandi atau PIN yang Anda masukkan salah. Silakan coba lagi.",
  ZITADEL_VERIFY_FAILED: "Gagal memverifikasi kata sandi ke server ZITADEL.",
  INVALID_PAYLOAD: "Format data yang dikirim tidak valid.",
  ACCOUNT_NOT_FOUND: "Akun tidak ditemukan.",
  SERVER_ERROR: "Terjadi kesalahan server internal.",
  TOO_MANY_REQUESTS: "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
};

export const ZITADEL_ERROR_CODES = {
  PASSWORD_INVALID: 3, // Kode ZITADEL untuk Invalid Password
  PASSWORD_COMMAND_ERROR: "COMMAND-3M0fs",
};
