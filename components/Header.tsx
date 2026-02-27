"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Menu, X, LogOut, User, Compass } from "lucide-react";
import { site } from "@/config/site";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { getAccessToken, authHeaders, clearAccessToken } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sideMenuRef = useRef<HTMLElement | null>(null);
  useEffect(() => setMounted(true), []);
  const [user, setUser] = useState<{ login: string; role?: string; fullName?: string | null } | null>(null);

  const close = useCallback(() => {
    setSideOpen(false);
    queueMicrotask(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    fetch("/api/profile", { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          clearAccessToken();
          setUser(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.login) setUser({ login: data.login, role: data.role, fullName: data.fullName });
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const displayName = (() => {
    if (!user) return "";
    if (user.role === "SUPERADMIN" || user.role === "ADMIN") return "Админ";
    if (user.fullName?.trim()) return user.fullName.trim();
    return user.login;
  })();

  const cabinetHref =
    user?.role === "ADMIN" || user?.role === "SUPERADMIN"
      ? "/admin/dashboard"
      : "/cabinet";

  const handleLogout = useCallback(async () => {
    close();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: "{}",
        credentials: "include",
      });
    } finally {
      clearAccessToken();
      setUser(null);
      router.push("/");
    }
  }, [close, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (!sideOpen || e.key !== "Tab") return;
      const aside = sideMenuRef.current;
      if (!aside) return;
      const focusables = aside.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    if (sideOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
      queueMicrotask(() => {
        const aside = sideMenuRef.current;
        const first = aside?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      });
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sideOpen, close]);

  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <header className="site-header site-header-landing sticky top-0 z-30 mt-4 w-full max-w-none rounded-none bg-transparent">
        <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-1.5 rounded-lg border-0 px-1.5 py-1.5 hover:bg-[var(--color-light-gray)] transition-all sm:gap-2 sm:px-2 sm:py-2" aria-label="На главную">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-brand-gold)] text-xs font-bold sm:h-7 sm:w-7 lg:h-8 lg:w-8 lg:text-sm"><span className="text-black">F</span><span className="text-black">T</span></span>
            <span className="site-header-logo-text font-[family:var(--font-playfair)] text-sm font-bold sm:text-base lg:text-lg text-[var(--color-navy)]"><span className="site-header-logo-free">Free</span><span className="text-[var(--color-brand-gold)]">Tips</span></span>
          </Link>
          <nav className="hidden lg:flex shrink-0 items-center justify-center gap-1.5 xl:gap-2 2xl:gap-3" aria-label="Навигация">
            <Link href="/#features" className="whitespace-nowrap rounded-xl border-0 bg-[var(--color-white)] px-2.5 py-2 font-medium text-[var(--color-navy)] transition-all hover:opacity-90 text-xs xl:px-3 xl:py-2.5 xl:text-sm 2xl:px-4 2xl:text-[15px]">Преимущества</Link>
            <Link href="/#process" className="whitespace-nowrap rounded-xl border-0 bg-[var(--color-white)] px-2.5 py-2 font-medium text-[var(--color-navy)] transition-all hover:opacity-90 text-xs xl:px-3 xl:py-2.5 xl:text-sm 2xl:px-4 2xl:text-[15px]">Как работает</Link>
            <Link href="/#business" className="whitespace-nowrap rounded-xl border-0 bg-[var(--color-white)] px-2.5 py-2 font-medium text-[var(--color-navy)] transition-all hover:opacity-90 text-xs xl:px-3 xl:py-2.5 xl:text-sm 2xl:px-4 2xl:text-[15px]">Для бизнеса</Link>
            <Link href="/oferta" className="whitespace-nowrap rounded-xl border-0 bg-[var(--color-white)] px-2.5 py-2 font-medium text-[var(--color-navy)] transition-all hover:opacity-90 text-xs xl:px-3 xl:py-2.5 xl:text-sm 2xl:px-4 2xl:text-[15px]">Тарифы</Link>
            <Link href="/kontakty" className="whitespace-nowrap rounded-xl border-0 bg-[var(--color-white)] px-2.5 py-2 font-medium text-[var(--color-navy)] transition-all hover:opacity-90 text-xs xl:px-3 xl:py-2.5 xl:text-sm 2xl:px-4 2xl:text-[15px]">Контакты</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
            {user ? (
              <>
                <Link href={cabinetHref} className="hidden sm:inline-flex max-w-[140px] truncate items-center justify-center rounded-xl bg-[var(--color-navy)] px-3 py-2 text-[var(--color-white)] font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 text-xs lg:max-w-[180px] lg:px-4 lg:py-2.5 lg:text-sm xl:text-[15px] xl:max-w-none">
                  {displayName}
                </Link>
                <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center rounded-xl bg-[var(--color-navy)] px-3 py-2 text-[var(--color-white)] font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm lg:text-[15px] lg:px-5">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex items-center justify-center rounded-xl border-0 bg-[var(--color-white)] px-3 py-2 text-[var(--color-navy)] font-semibold transition-all hover:opacity-90 text-xs lg:px-4 lg:py-2.5 lg:text-sm xl:text-[15px] xl:px-5">
                  Войти
                </Link>
                <Link href="/zayavka" className="inline-flex items-center justify-center rounded-xl bg-[var(--color-navy)] px-4 py-2 text-[var(--color-white)] font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 text-xs sm:px-5 sm:py-2.5 sm:text-sm lg:text-[15px] lg:px-7">
                  Начать
                </Link>
              </>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setSideOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--color-navy)] hover:bg-[var(--color-light-gray)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-2"
              aria-label="Открыть меню"
              aria-expanded={sideOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
        {sideOpen && (
          <>
            <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={close} aria-hidden />
            <aside ref={(el) => { sideMenuRef.current = el; }} className="fixed top-0 right-0 z-50 h-full w-[min(100vw-4rem,20rem)] bg-[var(--color-white)] shadow-2xl lg:hidden p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="font-[family:var(--font-playfair)] font-bold text-[var(--color-navy)]"><span className="site-header-logo-free">Free</span><span className="text-[var(--color-brand-gold)]">Tips</span></span>
                <button type="button" onClick={close} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-charcoal)] hover:bg-[var(--color-light-gray)]" aria-label="Закрыть">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-2">
                <Link href="/#features" onClick={close} className="py-3 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-accent-gold)]">Преимущества</Link>
                <Link href="/#process" onClick={close} className="py-3 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-accent-gold)]">Как работает</Link>
                <Link href="/#business" onClick={close} className="py-3 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-accent-gold)]">Для бизнеса</Link>
                <Link href="/oferta" onClick={close} className="py-3 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-accent-gold)]">Тарифы</Link>
                <Link href="/kontakty" onClick={close} className="py-3 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-accent-gold)]">Контакты</Link>
                <div className="mt-6 pt-6 border-0 flex flex-col gap-3">
                  {user ? (
                    <>
                      <Link href={cabinetHref} onClick={close} className="py-3 text-center font-semibold text-[var(--color-white)] bg-[var(--color-navy)] rounded-xl">Кабинет</Link>
                      <button type="button" onClick={handleLogout} className="py-3 text-center font-semibold text-[var(--color-white)] bg-[var(--color-navy)] rounded-xl">Выйти</button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={close} className="py-3 text-center font-semibold text-[var(--color-navy)] border-0 rounded-xl">Войти</Link>
                      <Link href="/zayavka" onClick={close} className="py-3 text-center font-semibold text-[var(--color-white)] bg-[var(--color-navy)] rounded-xl">Начать</Link>
                    </>
                  )}
                </div>
              </nav>
            </aside>
          </>
        )}
      </header>
    );
  }

  return (
    <header className="site-header sticky top-0 z-30 mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-2xl border border-white/10 bg-transparent">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={site.logo.href}
          className="flex items-center gap-2"
          aria-label="На главную"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] text-sm font-bold"><span className="text-black">F</span><span className="text-black">T</span></span>
          <span className="site-header-logo-text font-[family:var(--font-playfair)] text-lg font-bold text-[var(--color-navy)]"><span className="site-header-logo-free">Free</span><span className="text-[var(--color-brand-gold)]">Tips</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isLanding && (
            <div
              className="relative group/nav"
              onMouseEnter={() => setNavOpen(true)}
              onMouseLeave={() => setNavOpen(false)}
            >
              <button
                type="button"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] hover:opacity-90 transition-all"
                aria-haspopup="true"
                aria-expanded={navOpen}
                aria-label="Навигация по сайту"
              >
                <Compass className="h-4 w-4" />
                Навигация по сайту
              </button>
              <nav
                className={`absolute right-0 top-full pt-1 min-w-[220px] rounded-xl border-0 bg-[var(--color-white)] shadow-[var(--shadow-card)] py-2 z-40 transition-all duration-200 ${
                  navOpen ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
                aria-label="Меню навигации"
              >
                {site.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block mx-1.5 px-3 py-2.5 text-sm font-medium text-[var(--color-navy)] hover:text-[var(--color-accent-gold)] hover:bg-[var(--color-light-gray)] rounded-lg transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          {user ? (
            <>
              <Link
                href={cabinetHref}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[var(--shadow-subtle)]"
              >
                <User className="h-4 w-4" />
                {displayName}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[var(--shadow-subtle)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href={site.register.href}
                className="site-header-register min-h-[44px] inline-flex items-center justify-center rounded-xl border-0 px-4 py-2.5 text-sm font-semibold text-[var(--color-navy)] hover:opacity-90 transition-all"
              >
                {site.register.label}
              </Link>
              <Link
                href={site.cta.href}
                className="site-header-cta min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[var(--shadow-subtle)]"
              >
                {site.cta.label}
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSideOpen(true)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--color-navy)] hover:bg-[var(--color-light-gray)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-2"
            aria-label="Открыть меню"
            aria-expanded={sideOpen}
            aria-controls="side-menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

{mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="side-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Меню навигации"
            className={`md:hidden fixed inset-0 z-[9999] transition-opacity duration-300 ${
              sideOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={close}
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm cursor-pointer"
              aria-hidden
            />
            <aside
              ref={(el) => { sideMenuRef.current = el; }}
              className={`absolute top-0 right-0 z-10 h-full w-[min(100vw-4rem,20rem)] bg-[var(--color-white)] shadow-2xl flex flex-col transition-transform duration-300 ease-out border-0 ${
                sideOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex h-16 items-center justify-between px-4 border-0">
                <span className="font-[family:var(--font-playfair)] font-bold text-[var(--color-navy)]"><span className="site-header-logo-free">Free</span><span className="text-[var(--color-brand-gold)]">Tips</span></span>
                <button
                  type="button"
                  onClick={close}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--color-navy)] hover:bg-[var(--color-light-gray)]"
                  aria-label="Закрыть меню"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-1" aria-label="Меню">
                {site.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="min-h-[48px] flex items-center rounded-xl px-4 py-3 text-[var(--color-navy)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-accent-gold)] font-medium transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 pt-4 border-0 space-y-2">
                  {user ? (
                    <>
                      <Link
                        href={cabinetHref}
                        onClick={close}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 font-semibold text-[var(--color-white)] hover:opacity-90 transition-all"
                      >
                        <User className="h-4 w-4" />
                        {displayName}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 font-semibold text-[var(--color-white)] hover:opacity-90 transition-all"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Выйти
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={site.register.href}
                        onClick={close}
                        className="block rounded-xl border-0 px-4 py-3 text-center font-semibold text-[var(--color-navy)] hover:opacity-90 transition-all"
                      >
                        {site.register.label}
                      </Link>
                      <Link
                        href={site.cta.href}
                        onClick={close}
                        className="block rounded-xl bg-[var(--color-navy)] px-4 py-3 text-center font-semibold text-[var(--color-white)] hover:opacity-90 transition-all"
                      >
                        {site.cta.label}
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </aside>
          </div>,
          document.body
        )}
    </header>
  );
}
