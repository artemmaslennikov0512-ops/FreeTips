import type { Metadata } from "next";
import { TestLkMockLinkPage } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Моя ссылка" };

export default function TestLkMockLinkPageRoute() {
  return <TestLkMockLinkPage />;
}
