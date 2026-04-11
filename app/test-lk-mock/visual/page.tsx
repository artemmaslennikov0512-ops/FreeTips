import type { Metadata } from "next";
import { TestLkMockVisualSpec } from "../TestLkMockVisualSpec";

export const metadata: Metadata = { title: "Визуальная спека" };

export default function TestLkMockVisualPage() {
  return <TestLkMockVisualSpec />;
}
