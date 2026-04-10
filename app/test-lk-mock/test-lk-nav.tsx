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

export type TestLkNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Сценарий «зал / ресторан» — только в тестовом макете, в боевом /cabinet этих пунктов нет. */
export const TEST_LK_NAV_HALL_MOCK: TestLkNavItem[] = [
  { label: "Брони", href: `${TEST_LK_BASE}/bookings`, icon: Calendar },
  { label: "Зал / смена", href: `${TEST_LK_BASE}/floor`, icon: UtensilsCrossed },
  { label: "Гости", href: `${TEST_LK_BASE}/guests`, icon: Users },
];

/** Донаты стримера — макет; публичная страница ведёт на /test-preview/donate/… */
export const TEST_LK_NAV_STREAMER_MOCK: TestLkNavItem[] = [
  { label: "Донаты (стример)", href: `${TEST_LK_BASE}/streamer`, icon: Radio },
];

/** Пункты как в `app/cabinet/layout.tsx` → `NAV`. */
export const TEST_LK_NAV_CABINET_LIKE: TestLkNavItem[] = [
  { label: "Операции", href: `${TEST_LK_BASE}/transactions`, icon: List },
  { label: "Моя ссылка", href: `${TEST_LK_BASE}/link`, icon: Link2 },
  { label: "Подключиться к заведению", href: `${TEST_LK_BASE}/join-establishment`, icon: UserPlus },
  { label: "Покинуть заведение", href: `${TEST_LK_BASE}/leave-establishment`, icon: UserMinus },
  { label: "Верификация", href: `${TEST_LK_BASE}/verification`, icon: ShieldCheck },
  { label: "Поддержка", href: `${TEST_LK_BASE}/support`, icon: MessageCircle },
  { label: "Сессии", href: `${TEST_LK_BASE}/sessions`, icon: Laptop },
  { label: "Настройки профиля", href: `${TEST_LK_BASE}/settings`, icon: Settings },
];

export const TEST_LK_NAV_DASHBOARD: TestLkNavItem = {
  label: "Дашборд",
  href: TEST_LK_BASE,
  icon: LayoutDashboard,
};

/** Полный список для активного состояния и мобильного меню. */
export const TEST_LK_NAV: TestLkNavItem[] = [
  TEST_LK_NAV_DASHBOARD,
  ...TEST_LK_NAV_HALL_MOCK,
  ...TEST_LK_NAV_STREAMER_MOCK,
  ...TEST_LK_NAV_CABINET_LIKE,
];

export const TEST_LK_NAV_EXTRA: TestLkNavItem = {
  label: "Кабинет заведения",
  href: "/establishment",
  icon: Building2,
};

export function testLkIsNavActive(pathname: string, href: string): boolean {
  if (href === TEST_LK_BASE) return pathname === TEST_LK_BASE || pathname === `${TEST_LK_BASE}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}
