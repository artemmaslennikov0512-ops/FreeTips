/**
 * Единообразное преобразование unknown (catch) в строку для логов и ответов API.
 */

export function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
