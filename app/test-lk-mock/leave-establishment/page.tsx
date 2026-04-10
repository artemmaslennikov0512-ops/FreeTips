import type { Metadata } from "next";
import { TestLkMockLeaveEstablishmentView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Покинуть заведение" };

export default function Page() {
  return <TestLkMockLeaveEstablishmentView />;
}
