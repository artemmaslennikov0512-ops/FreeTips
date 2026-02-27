# Изучение документа Оглавление1.txt (интеграция с ПЦ Paygine)

Документ: **Оглавление1.txt** — полная инструкция по интеграции с ПЦ Paygine (~7112 строк, 140 стр. по пагинации). Прочитан **целиком**. Ниже — выжимка по разделам, релевантным для текущей интеграции (Register, callback, подпись), плюс обзор остального содержимого.

---

## 1. Настройки для интеграции (стр. 11)

| Параметр | Тест | Бой |
|----------|------|-----|
| URL запросов | https://test.paygine.com/webapi/ | https://pay.paygine.com/webapi/ |
| sector, password | После регистрации ТСП в ПЦ | — |
| ЛК | https://test.paygine.com/office/ | https://pay.paygine.com/office/ |

В коде: `lib/payment/paygine/client.ts` — только эти хосты разрешены.

---

## 2. Запрос webapi/Register — Регистрация заказа (стр. 19–25, Таблица 1)

- **Метод:** HTTP POST, `application/x-www-form-urlencoded`.
- **Обязательные параметры:** sector, amount, currency, description, **signature**.
- **Подпись запроса (Приложение №2):** в формировании подписи участвуют только **sector, amount, currency, password** в указанном порядке. Остальные параметры (reference, url, failurl, notify_url и т.д.) в подпись **не входят**.
- **Необязательные:** reference, url, failurl, notify_url, lang, life_period, fee, comment, email, phone и др. В документе **нет параметра sd_ref** в Таблице 1; он упоминается в кодах ошибок (261, 304, 312, 338) — значит, используется в расширениях/P2PMarket.
- **Ответ:** при успехе — XML `<order>...</order>` (при mode≠1) или ID заказа в формате text/plain (mode=1). Поддержка в коде: число или XML с тегом `<id>`.

**Реализация:** `lib/payment/paygine/client.ts` — `registerOrder()`: подпись = sector, amount, currency, password; порядок полей в теле: sector, amount, currency, reference, description, url, failurl, notify_url, sd_ref (если есть), signature. **Соответствует документу.**

---

## 3. Приложение №2. Формирование и проверка цифровой подписи (стр. 136–138)

**Алгоритм:**
1. Строка = значения параметров в заданном порядке для данного типа запроса + пароль ТСП.
2. SHA256(строка) в кодировке **UTF-8**.
3. Подпись = **Base64(hex-строка хэша в нижнем регистре)**. Не битовое представление хэша, а именно hex (lowercase) → Base64.

**Пример REGISTER:** str = sector + amount + currency + password (например `1100643test`).

**Ответные XML (order, operation):** подпись = конкатенация значений **всех тегов** в порядке следования в документе + password. Документ: «набор полей таких сообщений не фиксирован и может изменяться» — проверять по фактическому порядку тегов в пришедшем XML.

**Реализация:** `lib/payment/paygine/signature.ts` — `buildPaygineSignature(orderedValues, password)` → join("") + password, SHA256(utf8), digest("hex").toLowerCase(), Base64(hex). **Соответствует.**

---

## 4. Уведомление на URL о совершённой операции (стр. 15, 370)

- ПЦ отправляет уведомление методом **HTTP POST**.
- Формат — XML (Приложение №1, п.2): `<operation>` с тегами order_id, order_state, reference, id, date, type, state, reason_code, message, amount, currency, approval_code, signature и др.
- Ответ ИС ТСП: **«ok» (text/plain)** в течение 5 секунд; иначе ПЦ повторяет до 3 раз с интервалом 5 минут.
- Подпись: значения всех тегов в порядке следования + password (Приложение №2).

**Реализация:** `lib/payment/paygine-gateway.ts` — парсим XML, собираем значения тегов по порядку (кроме signature), проверяем подпись, обновляем транзакцию по state/order_state; ответ 200 с телом `ok` (text/plain). **Соответствует.**

---

## 5. Приложение №1, п.2 — Формат XML колбэка (стр. 125–126)

Теги: order_id, order_state, reference, id, date, type, state, reason_code, message, name, pan, email, amount, currency, approval_code, signature. Часть тегов может отсутствовать в зависимости от типа операции. Успех: state=APPROVED, reason_code=1; для заказа order_state=COMPLETED и т.п.

**Реализация:** маппинг state/order_state → SUCCESS или FAILED; логирование. **Соответствует.**

---

## 6. Реализация на сайте (по документу)

- **Карта:** после Register редирект на `webapi/Purchase` (Таблица 2): sector, id, signature. Подпись: sector, id, password.
- **СБП:** редирект на `webapi/PurchaseSBP` (Таблица 44): sector, id, signature. Подпись: sector, id, password.
- url/failurl задаются в Register и не передаются в форме Purchase/PurchaseSBP.
- **SDPayIn, SDPayInSBP** — в Оглавление1 не описаны (это P2PMarket/Safe Deposit); на сайте используется только поток по документу (Purchase, PurchaseSBP).

---

## 7. Коды ошибок (Приложение №1, табл. 57 и далее)

Примеры: 109 — неверная подпись; 110 — отсутствует reference; 127 — отказ плательщика; 261 — sd_ref не найден; 317 — лимит SDPayIn. Обработка в коде: при ошибке Register возвращаем описание пользователю; в webhook при неверной подписи — 400.

---

**Итог:** интеграция Register, формирования подписи (Приложение №2), приёма и проверки колбэка (Приложение №1 п.2, №3) и ответа «ok» соответствует документу Оглавление1.txt. Методы SDPayIn/SDPayInSBP в этом файле не описаны; для них используется отдельная спецификация P2PMarket.

---

## 8. Прочитано полностью (обзор остального содержимого)

Файл прочитан целиком (~7112 строк). Краткий обзор разделов помимо уже описанных выше.

### 8.1 Запросы API (таблицы 2–56)

- **Оплаты:** Purchase (2), Authorize (3), AuthorizeInc (4), Complete (5), gateweb/Payment (6), Reverse (7), gateweb/Verify (8), CheckVerifyStatus (10), AlfaPay (11), PurchaseBySectorCard (12), PaymentFee (13).
- **Справки:** Operation (14), Order (15), ChangeOrderStatus (16), OrderList (17), GetShortLink (18), GetOperationConfirmation (19), Ping.
- **Рекурренты:** Recurring (20), Cancel (21), ChangeRec (22), ChangeRecCard (23), SetRec (24), ReverseKeepRec (25), CardEnroll (26), PurchaseByToken/AuthorizeByToken (27), RecurringByToken (28), CheckToken (29).
- **P2P:** P2PTransfer (30), gateweb/P2PTransfer (31), P2PFee (32), P2PDebit (33), P2PComplete (34), gateweb/P2PCredit (35), P2PCreditBalance (36).
- **Прочее:** CardInfo (37), IdentificationStatus (38–39), GetScoring (40), SmsSend (41), SmsStatus (42–43).
- **СБП:** GetSBPSubscription (44), GetSBPSubscriptionState (45), PurchaseSBPByToken (50), test/SBPTestCase (51), GetSBPBankList (52), SBPCreditPrecheck (53), SBPCredit (54), SBPCreditBalance (55). Таблица 56 — тестовые сценарии СБП-выплат (phone/recipientBankId для разных исходов).

### 8.2 Приложение №1 (форматы XML и ошибки)

- П.1 — ответ на REGISTER (`<order>`).
- П.2 — уведомление по операции (`<operation>`).
- П.3 — ответ на запрос ORDER (`<order>` с вложенными `<operation>`).
- П.4 — формат ошибки `<error>` с `<description>` и `<code>`.
- **Таблица 57** — полный список кодов ошибок (100–346): 100–130 (операции/заказы/сектор/подпись/параметры), 121–330+ (активация, лимиты, СБП, sd_ref, фискальные данные, 3DS, банки, гейты и т.д.). В т.ч. 261 — sd_ref не найден, 317 — SDPayIn limit, 237 — SDPayInDebit operation lost.
- **Таблица 58** — Reason Code по операциям: 1 — успех, 2–22 — отказ/карта/лимиты/3DS/таймаут и т.д.; отдельно коды для СБП-привязки (6, 8, 34–42).

### 8.3 Приложение №2 (подпись)

- Алгоритм: строка параметров в порядке + password → SHA256(UTF-8) → Base64(hex lowercase).
- Примеры для: REGISTER (sector, amount, currency, password); PURCHASE/AUTHORIZE (sector, id, password); OPERATION (sector, id, operation, password); COMPLETE/REVERSE (sector, id, amount, currency, password); ORDER (sector, id, password). Для ответных XML — конкатенация всех тегов по порядку + password.

### 8.4 Приложение №3 (callback)

- **Callback по СБП-операции:** `<operation>` с type=PURCHASE_BY_QR, qrcId, sbpTranId и др. Опционально второй колбэк `<SBPOperationDetails>` (расширенный с ФИО/телефоном или сокращённый с verified_phone/verified_FIO).
- **Callback по СБП-привязке:** `<SBPSubscriptionState>` — qrcId, subscription_state (ACCEPTED/REJECTED), при успехе token, member_id.
- **Callback по остатку:** `<BankOperation>` — bank_id, account, P-поля (P008, P024, … P060), signature.
