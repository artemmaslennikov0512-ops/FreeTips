"use client";

import { PAY_ERROR_ALERT } from "@/lib/pay-ui-classes";

/** Красная строка под формой оплаты (role=alert). */
export function PayInlineError({ children }: { children: React.ReactNode }) {
  return (
    <p className={PAY_ERROR_ALERT} role="alert">
      {children}
    </p>
  );
}
