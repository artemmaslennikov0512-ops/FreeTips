"use client";

import { useEffect } from "react";

export function AutoSubmitForm({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (form) form.submit();
  }, [formId]);
  return null;
}
