/**
 * Приложение №2. Формирование и проверка цифровой подписи.
 *
 * Алгоритм (как в документе):
 * 1. Формируется строка из значений заданных параметров для каждого вида Запросов
 *    в указанном порядке, в конец добавляется пароль ТСП.
 * 2. Строка преобразуется в хэш SHA256 (обязательно UTF-8 для русских символов).
 * 3. В подпись кодируется не битовое представление хеша, а его шестнадцатеричное
 *    строковое представление в нижнем регистре — затем Base64.
 */

import { createHash } from "crypto";

export function buildPaygineSignature(orderedValues: string[], password: string): string {
  const str = orderedValues.join("") + password;
  const sha256Hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(sha256Hex, "utf8").toString("base64");
}
