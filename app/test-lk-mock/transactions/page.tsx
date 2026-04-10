import type { Metadata } from "next";
import { TestLkMockTransactionsView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Операции" };

export default function TestLkMockTransactionsPage() {
  return <TestLkMockTransactionsView />;
}
