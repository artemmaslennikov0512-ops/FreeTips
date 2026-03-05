import type { NextConfig } from "next";

// Разрешаем отправку форм на Paygine (тест и прод). Иначе CSP form-action 'self' блокирует редирект оплаты.
const PAYGINE_ORIGINS = "https://test.paygine.com https://pay.paygine.com";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/favicon.png?v=4", permanent: false }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/favicon.png",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `form-action 'self' ${PAYGINE_ORIGINS}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
