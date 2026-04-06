import Link from "next/link";
import type { Metadata } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://free-tips.ru";

export const metadata: Metadata = {
  title: "Digital tipping for teams",
  description:
    "FreeTips lets guests tip by card or Apple Pay / Google Pay via QR or link — no guest app required. Russian site: full product and legal pages.",
  alternates: { canonical: `${baseUrl}/en`, languages: { ru: baseUrl, en: `${baseUrl}/en` } },
};

export default function EnglishLandingPage() {
  return (
    <main lang="en" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-[var(--color-muted)]">
        <Link href="/" className="text-[var(--color-accent-gold)] hover:underline underline-offset-2">
          Русская версия
        </Link>
      </p>
      <h1 className="mt-6 font-[family:var(--font-playfair)] text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">
        FreeTips — digital tipping
      </h1>
      <p className="mt-4 text-lg text-[var(--color-text-secondary)] leading-relaxed">
        Guests pay the way they already do — phone or card. No guest registration. Branded pay page and QR for staff; dashboards
        for employees and venues.
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-[var(--color-text-secondary)]">
        <li>QR and short links for each recipient</li>
        <li>Card, Apple Pay, Google Pay</li>
        <li>Optional mobile app with API key from the cabinet</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/zayavka"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-navy)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Request access (RU)
        </Link>
        <Link
          href="/kontakty"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-light-gray)]"
        >
          Contacts
        </Link>
      </div>
      <p className="mt-10 text-sm text-[var(--color-muted)] leading-relaxed">
        Contracts, privacy policy, and refund rules are published in Russian on the main site. For English-speaking partners,
        contact us — we will help with onboarding.
      </p>
    </main>
  );
}
