/**
 * Короткие сообщения для пользователя (сеть, оплата, редирект).
 * Импортируйте отсюда вместо дублирования строк в fetch catch / res !ok.
 */

export const CLIENT_MSG_CONNECTION_ERROR = "Ошибка соединения";

export const CLIENT_MSG_PAGE_LOAD_FAILED = "Не удалось загрузить страницу";

/** /pay/[slug]: нет получателя */
export const PAY_MSG_LINK_NOT_FOUND = "Ссылка не найдена";

/** Ответ POST /api/pay без текста ошибки */
export const PAY_MSG_PAYMENT_GENERIC_ERROR = "Ошибка оплаты";

export const PAY_MSG_PAYMENT_DECLINED = "Платёж не прошёл";

export const PAY_MSG_MIN_AMOUNT_RUB = "Минимальная сумма — 1 ₽";

/** /pay/table/[slug] */
export const PAY_MSG_TABLE_NOT_FOUND = "Стол не найден";

/** /pay/redirect (сервер) */
export const PAY_MSG_GATEWAY_NOT_CONFIGURED = "Платёжный шлюз не настроен.";

export const PAY_MSG_TRANSACTION_NOT_FOUND = "Платёж не найден.";

export const PAY_MSG_TRANSACTION_ALREADY_FINAL = "Платёж уже обработан или отменён.";

export const PAY_MSG_TRANSACTION_INVALID_DATA = "Неверные данные платежа.";
