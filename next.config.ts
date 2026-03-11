import type { NextConfig } from "next";

// Разрешаем отправку форм на Paygine (тест и прод). Иначе CSP form-action 'self' блокирует редирект оплаты.
const PAYGINE_ORIGINS = "https://test.paygine.com https://pay.paygine.com";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Лимит тела запроса для загрузки файлов (верификация — до 10 МБ)
    proxyClientMaxBodySize: "10mb",
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon-32x32", permanent: false }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Content-Security-Policy",
        value: `form-action 'self' ${PAYGINE_ORIGINS}`,
      },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
