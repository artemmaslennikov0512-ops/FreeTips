import type { Metadata } from "next";
import TablePayGuestClient from "./TablePayGuestClient";

export const metadata: Metadata = {
  title: "Оплата по столу",
  robots: { index: false, follow: false },
};

export default function TablePayPage() {
  return <TablePayGuestClient />;
}
