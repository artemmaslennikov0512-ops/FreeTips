import type { Metadata } from "next";
import { TestLkMockSupportView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Поддержка" };

export default function Page() {
  return <TestLkMockSupportView />;
}
