import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  List,
  Link2,
  UserPlus,
  UserMinus,
  ShieldCheck,
  MessageCircle,
  Laptop,
  Settings,
  Building2,
} from "lucide-react";

export const TEST_LK_BASE = "/test-lk-mock";

export type TestLkNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Те же пункты, что в `app/cabinet/layout.tsx` → `NAV` (без фильтра по ролям — всё видно в макете). */
export const TEST_LK_NAV: TestLkNavItem[] = [
  { label: "Дашборд", href: TEST_LK_BASE, icon: LayoutDashboard },
  { label: "Операции", href: `${TEST_LK_BASE}/transactions`, icon: List },
  { label: "Моя ссылка", href: `${TEST_LK_BASE}/link`, icon: Link2 },
  { label: "Подключиться к заведению", href: `${TEST_LK_BASE}/join-establishment`, icon: UserPlus },
  { label: "Покинуть заведение", href: `${TEST_LK_BASE}/leave-establishment`, icon: UserMinus },
  { label: "Верификация", href: `${TEST_LK_BASE}/verification`, icon: ShieldCheck },
  { label: "Поддержка", href: `${TEST_LK_BASE}/support`, icon: MessageCircle },
  { label: "Сессии", href: `${TEST_LK_BASE}/sessions`, icon: Laptop },
  { label: "Настройки профиля", href: `${TEST_LK_BASE}/settings`, icon: Settings },
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
