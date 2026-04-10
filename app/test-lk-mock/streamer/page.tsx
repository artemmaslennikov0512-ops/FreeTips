import type { Metadata } from "next";
import { TestLkMockStreamerView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Донаты (стример)" };

export default function TestLkMockStreamerPage() {
  return <TestLkMockStreamerView />;
}
