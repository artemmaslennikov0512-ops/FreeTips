import type { Metadata } from "next";
import { Syne, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { GridCursorEffect } from "@/components/GridCursorEffect";
import { LandingWrapper } from "@/components/LandingWrapper";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { ThemeProvider } from "@/lib/theme-context";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-syne",
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-playfair",
  preload: false,
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const siteName = "FreeTips";
const defaultTitle = `${siteName} | Сервис премиальных чаевых для профессионалов`;
const defaultDescription =
  "Безопасный и уважительный способ получать достойное вознаграждение за ваш труд. Премиальные чаевые для профессионалов.";
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://free-tips.ru";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description: defaultDescription,
  keywords: [
    "чаевые",
    "премиальные чаевые",
    "сервис чаевых",
    "чаевые для официантов",
    "чаевые онлайн",
    "FreeTips",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: baseUrl,
    siteName,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  alternates: { canonical: baseUrl },
  // Фавикон: 32×32 для вкладки (чётко), SVG и 1024 PNG для остального
  icons: [
    { url: "/icon-32x32", type: "image/png", sizes: "32x32" },
    { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    { url: "/icon?v=3", type: "image/png", sizes: "1024x1024" },
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.className} ${inter.variable} ${syne.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" href={`${baseUrl}/sitemap.xml`} title="Sitemap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=typeof location!=='undefined'?location.pathname:'';var ok=p.startsWith('/cabinet')||p.startsWith('/admin')||p.startsWith('/establishment')||p.startsWith('/pay')||p.startsWith('/login')||p.startsWith('/register')||p.startsWith('/zayavka')||p.startsWith('/forgot-password')||p.startsWith('/change-password')||p.startsWith('/reset-password');var t=ok?localStorage.getItem('theme'):null;document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})();`,
          }}
        />
        <GridCursorEffect />
        <a href="#main-content" className="sr-only">Перейти к основному содержимому</a>
        <ThemeProvider>
          <LandingWrapper>
            <ConditionalLayout>{children}</ConditionalLayout>
          </LandingWrapper>
        </ThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
