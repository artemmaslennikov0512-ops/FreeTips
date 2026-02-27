import type { ZodError } from "zod";

/** Преобразует ошибки Zod в объект поле → первое сообщение для отображения под полями формы. */
export function getFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  const flat = error.flatten().fieldErrors;
  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) out[key] = messages[0];
  }
  return out;
}
