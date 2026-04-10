import type { Metadata } from "next";
import { TestLkMockVerificationView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Верификация" };

export default function Page() {
  return <TestLkMockVerificationView />;
}
