import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { GridCursorEffect } from "@/components/GridCursorEffect";
import { LandingWrapper } from "@/components/LandingWrapper";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { ThemeProvider } from "@/lib/theme-context";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
  preload: false,
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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${plusJakartaSans.className} ${syne.variable} ${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=typeof location!=='undefined'?location.pathname:'';var ok=p.startsWith('/cabinet')||p.startsWith('/admin')||p.startsWith('/pay')||p.startsWith('/login')||p.startsWith('/register')||p.startsWith('/zayavka')||p.startsWith('/forgot-password')||p.startsWith('/change-password');var t=ok?localStorage.getItem('theme'):null;document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})();`,
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
