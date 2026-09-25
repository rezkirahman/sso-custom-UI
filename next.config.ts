import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Mencegah Clickjacking (tidak bisa di-embed di iframe)
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Mencegah MIME-sniffing
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload", // Paksa HTTPS
          },
        ],
      },
    ];
  },
};

export default nextConfig;
