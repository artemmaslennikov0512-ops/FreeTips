/**
 * Страница результата оплаты (success/fail).
 * Paygine может редиректить сюда: /pay/result?tid=...&outcome=success|fail
 */

import { PayResultClient } from "./PayResultClient";

type SearchParams = { tid?: string; outcome?: string };

export default async function PayResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tid, outcome } = await searchParams;
  return <PayResultClient tid={tid} outcome={outcome} />;
}
