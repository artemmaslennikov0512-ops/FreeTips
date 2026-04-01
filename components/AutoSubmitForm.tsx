"use client";

import { useLayoutEffect } from "react";

export function AutoSubmitForm({ formId }: { formId: string }) {
  useLayoutEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    // Сразу после вставки DOM в дерево — до отрисовки, чтобы реже ловить гонку с Strict Mode / гидрацией.
    form.submit();
  }, [formId]);
  return null;
}
