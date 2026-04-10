import type { Metadata } from "next";
import { TestLkMockBookingsView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Брони" };

export default function Page() {
  return <TestLkMockBookingsView />;
}
