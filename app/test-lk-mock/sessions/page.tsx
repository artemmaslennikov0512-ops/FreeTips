import type { Metadata } from "next";
import { TestLkMockSessionsView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Сессии" };

export default function Page() {
  return <TestLkMockSessionsView />;
}
