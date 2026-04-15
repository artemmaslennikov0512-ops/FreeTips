import type { ReactNode } from "react";
import { PAY_NOTICE_PAGE } from "@/lib/pay-ui-classes";

/** Узкая колонка для сообщений на вспомогательных страницах оплаты (редирект и т.п.). */
export function PayNoticeFrame({ children }: { children: ReactNode }) {
  return <div className={PAY_NOTICE_PAGE}>{children}</div>;
}
