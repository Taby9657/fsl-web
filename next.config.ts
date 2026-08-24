import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "api.qrserver.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      // Stripe se vrací na /payments (cancel_url v backendu)
      { source: "/payments", destination: "/platby", permanent: false },
      { source: "/matches", destination: "/zapasy", permanent: true },
      { source: "/table", destination: "/tabulka", permanent: true },
      { source: "/stats", destination: "/statistiky", permanent: true },
      { source: "/teams", destination: "/tymy", permanent: true },
    ];
  },
};

export default nextConfig;
