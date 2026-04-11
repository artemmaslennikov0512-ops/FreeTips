import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  UtensilsCrossed,
  Users,
  List,
  Link2,
  UserPlus,
  UserMinus,
  ShieldCheck,
  MessageCircle,
  Laptop,
  Settings,
  Building2,
  Radio,
} from "lucide-react";

export const TEST_LK_BASE = "/test-lk-mock";
/** Тот же макет и меню, что у `/test-lk-mock`; другой префикс URL для закладок и встраивания. */
export const TEST_LK_CABINET_NAV_BASE = "/test-lk-mock/cabinet-nav";

export type TestLkNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  iconClass: string;
  /** Пункты сценария зала / стрима — в бою пока нет */
  inDevelopment?: boolean;
};

function hrefFor(basePath: string, segment: string): string {
  if (segment === "") return basePath;
  return `${basePath}${segment}`;
}

function devItems(basePath: string): TestLkNavItem[] {
  return [
    { label: "Брони", href: hrefFor(basePath, "/bookings"), icon: Calendar, iconClass: "!text-violet-400", inDevelopment: true },
    { label: "Зал / смена", href: hrefFor(basePath, "/floor"), icon: UtensilsCrossed, iconClass: "!text-orange-400", inDevelopment: true },
    { label: "Гости", href: hrefFor(basePath, "/guests"), icon: Users, iconClass: "!text-cyan-400", inDevelopment: true },
    { label: "Донаты (стример)", href: hrefFor(basePath, "/streamer"), icon: Radio, iconClass: "!text-pink-400", inDevelopment: true },
  ];
}

/** Как в `app/cabinet/layout.tsx` → `NAV` (подписи и порядок). */
function cabinetLikeItems(basePath: string): TestLkNavItem[] {
  return [
    { label: "Операции", href: hrefFor(basePath, "/transactions"), icon: List, iconClass: "!text-emerald-400" },
    { label: "Моя ссылка", href: hrefFor(basePath, "/link"), icon: Link2, iconClass: "!text-amber-400" },
    { label: "Подключиться к заведению", href: hrefFor(basePath, "/join-establishment"), icon: UserPlus, iconClass: "!text-rose-400" },
    { label: "Покинуть заведение", href: hrefFor(basePath, "/leave-establishment"), icon: UserMinus, iconClass: "!text-orange-400" },
    { label: "Верификация", href: hrefFor(basePath, "/verification"), icon: ShieldCheck, iconClass: "!text-violet-400" },
    { label: "Поддержка", href: hrefFor(basePath, "/support"), icon: MessageCircle, iconClass: "!text-cyan-400" },
    { label: "Сессии", href: hrefFor(basePath, "/sessions"), icon: Laptop, iconClass: "!text-slate-300" },
    { label: "Настройки профиля", href: hrefFor(basePath, "/settings"), icon: Settings, iconClass: "!text-orange-400" },
  ];
}

const dashboardItem = (basePath: string): TestLkNavItem => ({
  label: "Дашборд",
  href: basePath,
  icon: LayoutDashboard,
  iconClass: "!text-sky-400",
});

export const TEST_LK_NAV_EXTRA: TestLkNavItem = {
  label: "Кабинет заведения",
  href: "/establishment",
  icon: Building2,
  iconClass: "!text-amber-400",
};

export type TestLkNavSection = { title: string | null; items: TestLkNavItem[] };

/**
 * Новый визуал (--tlk-*) для всего тестового ЛК.
 * Порядок и названия разделов — как в боевом меню; макетные сценарии — внизу с пометкой «в разработке».
 */
export function buildTestLkNavSections(basePath: string): TestLkNavSection[] {
  return [
    { title: null, items: [dashboardItem(basePath), ...cabinetLikeItems(basePath)] },
    { title: "В разработке", items: devItems(basePath) },
  ];
}

export function flattenTestLkNavSections(sections: TestLkNavSection[]): TestLkNavItem[] {
  return sections.flatMap((s) => s.items);
}

export function testLkIsNavActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname === `${href}/`) return true;
  return pathname.startsWith(`${href}/`);
}
