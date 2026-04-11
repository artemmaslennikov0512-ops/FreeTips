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
  Palette,
} from "lucide-react";

export const TEST_LK_BASE = "/test-lk-mock";

export type TestLkNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Как в боевом NAV — цвет иконки Lucide */
  iconClass: string;
};

/** Сценарий «зал / ресторан» — только в тестовом макете, в боевом /cabinet этих пунктов нет. */
export const TEST_LK_NAV_HALL_MOCK: TestLkNavItem[] = [
  { label: "Брони", href: `${TEST_LK_BASE}/bookings`, icon: Calendar, iconClass: "!text-violet-400" },
  { label: "Зал / смена", href: `${TEST_LK_BASE}/floor`, icon: UtensilsCrossed, iconClass: "!text-orange-400" },
  { label: "Гости", href: `${TEST_LK_BASE}/guests`, icon: Users, iconClass: "!text-cyan-400" },
];

export const TEST_LK_NAV_STREAMER_MOCK: TestLkNavItem[] = [
  { label: "Донаты (стример)", href: `${TEST_LK_BASE}/streamer`, icon: Radio, iconClass: "!text-pink-400" },
];

export const TEST_LK_NAV_REFERENCE: TestLkNavItem[] = [
  { label: "Визуальная спека", href: `${TEST_LK_BASE}/visual`, icon: Palette, iconClass: "!text-fuchsia-400" },
];

/** Пункты как в `app/cabinet/layout.tsx` → `NAV`. */
export const TEST_LK_NAV_CABINET_LIKE: TestLkNavItem[] = [
  { label: "Операции", href: `${TEST_LK_BASE}/transactions`, icon: List, iconClass: "!text-emerald-400" },
  { label: "Моя ссылка", href: `${TEST_LK_BASE}/link`, icon: Link2, iconClass: "!text-amber-400" },
  { label: "Подключиться к заведению", href: `${TEST_LK_BASE}/join-establishment`, icon: UserPlus, iconClass: "!text-rose-400" },
  { label: "Покинуть заведение", href: `${TEST_LK_BASE}/leave-establishment`, icon: UserMinus, iconClass: "!text-orange-400" },
  { label: "Верификация", href: `${TEST_LK_BASE}/verification`, icon: ShieldCheck, iconClass: "!text-violet-400" },
  { label: "Поддержка", href: `${TEST_LK_BASE}/support`, icon: MessageCircle, iconClass: "!text-cyan-400" },
  { label: "Сессии", href: `${TEST_LK_BASE}/sessions`, icon: Laptop, iconClass: "!text-slate-400" },
  { label: "Настройки профиля", href: `${TEST_LK_BASE}/settings`, icon: Settings, iconClass: "!text-orange-400" },
];

export const TEST_LK_NAV_DASHBOARD: TestLkNavItem = {
  label: "Дашборд",
  href: TEST_LK_BASE,
  icon: LayoutDashboard,
  iconClass: "!text-sky-400",
};

export const TEST_LK_NAV: TestLkNavItem[] = [
  TEST_LK_NAV_DASHBOARD,
  ...TEST_LK_NAV_HALL_MOCK,
  ...TEST_LK_NAV_STREAMER_MOCK,
  ...TEST_LK_NAV_REFERENCE,
  ...TEST_LK_NAV_CABINET_LIKE,
];

export const TEST_LK_NAV_EXTRA: TestLkNavItem = {
  label: "Кабинет заведения",
  href: "/establishment",
  icon: Building2,
  iconClass: "!text-amber-400",
};

export const TEST_LK_NAV_SECTIONS: { title: string | null; items: TestLkNavItem[] }[] = [
  { title: null, items: [TEST_LK_NAV_DASHBOARD] },
  { title: "Сценарий зала (макет)", items: TEST_LK_NAV_HALL_MOCK },
  { title: "Стримеры (макет)", items: TEST_LK_NAV_STREAMER_MOCK },
  { title: "Оформление (спека)", items: TEST_LK_NAV_REFERENCE },
  { title: "Как в /cabinet", items: TEST_LK_NAV_CABINET_LIKE },
];

export function testLkIsNavActive(pathname: string, href: string): boolean {
  if (href === TEST_LK_BASE) return pathname === TEST_LK_BASE || pathname === `${TEST_LK_BASE}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}
