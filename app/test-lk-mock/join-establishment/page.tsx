import type { Metadata } from "next";
import { TestLkMockJoinEstablishmentView } from "../TestLkMockViews";

export const metadata: Metadata = { title: "Подключиться к заведению" };

export default function Page() {
  return <TestLkMockJoinEstablishmentView />;
}
