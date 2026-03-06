import type { ZodError } from "zod";

function collectFieldErrors(
  fieldErrors: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value) && typeof value[0] === "string") {
      out[fullKey] = value[0];
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, collectFieldErrors(value as Record<string, unknown>, fullKey));
    }
  }
  return out;
}

/** Преобразует ошибки Zod в объект поле → первое сообщение для отображения под полями формы. */
export function getFieldErrors(error: ZodError): Record<string, string> {
  const flat = error.flatten().fieldErrors as Record<string, unknown>;
  const collected = collectFieldErrors(flat);
  // Для discriminatedUnion пути бывают "0.fieldName" или "1.fieldName" — показываем по fieldName
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(collected)) {
    const lastPart = path.includes(".") ? path.split(".").pop()! : path;
    out[lastPart] = message;
  }
  return out;
}
