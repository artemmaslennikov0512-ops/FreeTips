import type { Metadata } from "next";
import { Syne, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { GridCursorEffect } from "@/components/GridCursorEffect";
import { LandingWrapper } from "@/components/LandingWrapper";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { ThemeProvider } from "@/lib/theme-context";
import { SHELL_CHROME_BOOT_SCRIPT } from "@/lib/document-shell-chrome-boot";

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
const defaultTitle = `${siteName} | Сервис онлайн чаевых по QR - коду`;
const defaultDescription = "Быстро и удобно. Возможность оплаты картой получателя.";
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: defaultTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/opengraph-image"],
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
  viewportFit: "cover",
  // Должен совпадать с фоном body ЛК/админки в тёмной теме (#0d0e12 в globals), иначе iOS Safari даёт артефакты в области статус-бара
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d4d8de" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.className} ${inter.variable} ${syne.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" href={`${baseUrl}/sitemap.xml`} title="Sitemap" />
        {/*
          После метаданных Next (viewport / theme-color): одна theme-color без media под localStorage — иначе iOS Safari
          оставляет светлую панель при системной светлой теме и тёмном ЛК.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: SHELL_CHROME_BOOT_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
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
