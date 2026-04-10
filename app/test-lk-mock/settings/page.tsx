import type { Metadata } from "next";
import { TestLkMockSettingsView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Настройки профиля" };

export default function Page() {
  return <TestLkMockSettingsView />;
}
