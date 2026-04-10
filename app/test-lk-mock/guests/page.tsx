import type { Metadata } from "next";
import { TestLkMockGuestsView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Гости" };

export default function Page() {
  return <TestLkMockGuestsView />;
}
