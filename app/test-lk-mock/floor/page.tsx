import type { Metadata } from "next";
import { TestLkMockFloorView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Зал / смена" };

export default function Page() {
  return <TestLkMockFloorView />;
}
