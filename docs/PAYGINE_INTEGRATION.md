# Интеграция Paygine по документу «Интеграция с ПЦ» (Оглавление1.txt)

Реализация по официальной инструкции Paygine: порядок параметров, состав подписи (Приложение №2), проверка колбэков (Приложение №1 п.2, №3), URL из раздела «Настройки для интеграции».

**Документ:** в папке [`docs/paygine/`](paygine/) — **Оглавление1.txt** (таблицы 1, 2, 44, Приложения №1–№3).

Схема:

1. **Регистрация заказа** — `webapi/Register` (Таблица 1). Обязательно перед оплатой. В запросе: sector, amount, currency, reference, description, url, failurl, notify_url, при необходимости sd_ref, signature.
2. **Оплата картой** — редирект пользователя на `webapi/Purchase` (Таблица 2). В форме только sector, id, signature. Сумма и url/failurl берутся из Заказа.
3. **Оплата СБП** — редирект на `webapi/PurchaseSBP` (Таблица 44). В форме sector, id, signature. На странице ПЦ отображается QR-код СБП.

Поддерживаются **тестовый** и **боевой** контуры. Разрешены только хосты: `test.paygine.com`, `pay.paygine.com`.

## Настройка

### Тестовый стенд

В `.env`:

```env
PAYGINE_SECTOR=ваш_тестовый_сектор
PAYGINE_PASSWORD=тестовый_пароль_подписи
# PAYGINE_SD_REF= опционально; в ЛК часто нет — не задавать, деньги идут на счёт sector
# PAYGINE_BASE_URL не задавать — по умолчанию https://test.paygine.com
```

Реквизиты: личный кабинет ТСП на [test.paygine.com/office/](https://test.paygine.com/office/).

### Боевой контур (настоящая платежка)

1. Заключить договор с Paygine, получить **боевые** sector и password.
2. В production `.env` задать:

```env
PAYGINE_SECTOR=боевой_сектор
PAYGINE_PASSWORD=боевой_пароль_подписи
# PAYGINE_SD_REF= только если в схеме Paygine указан отдельный sd_ref
PAYGINE_BASE_URL=https://pay.paygine.com
```

3. В личном кабинете Paygine указать **URL уведомлений**. Поддерживаются оба варианта:
   - `https://ваш-домен/api/payment/webhook`
   - `https://ваш-домен/api/v1/webhooks/paygine`  
   URL должен быть доступен извне (HTTPS).

4. После первого платежа проверить в ЛК Paygine доставку уведомлений и статусы операций.

## Поведение (тест и прод одинаково)

- На странице оплаты `/pay/[slug]` доступна только оплата **картой** (СБП с сайта убран).
- При нажатии «Оплатить»:
  1. Создаётся транзакция со статусом `PENDING`.
  2. Вызывается `webapi/Register` (сумма, валюта 643, reference = idempotencyKey, url, failurl, notify_url; при необходимости sd_ref).
  3. В ответ приходит ID заказа, сохраняется в `Transaction.externalId`.
  4. Клиенту возвращается `redirectUrl` на `/pay/redirect?tid=...&method=card|sbp`.
- Страница `/pay/redirect` строит форму SDPayIn (оплата картой) и отправляет POST на Paygine. url/failurl заданы в форме.
- После оплаты ПЦ перенаправляет пользователя на url/failurl из Заказа (наш `/pay/result?tid=...&outcome=success|fail`).
- ПЦ шлёт уведомление на `POST /api/payment/webhook` (или `/api/v1/webhooks/paygine`) в формате XML. Подпись проверяется по Приложению №2 (значения тегов по порядку + password). Транзакция обновляется (SUCCESS при state=APPROVED или order_state=COMPLETED). В ответ — `200` и тело `ok` (text/plain). URL уведомлений в ЛК Paygine должен быть доступен извне (HTTPS).

## Соответствие документу (Оглавление1.txt)

- **Register (Таблица 1):** обязательные sector, amount, currency, description, signature; необязательные reference, url, failurl, notify_url, sd_ref и др. Подпись: sector, amount, currency, password → SHA256(UTF-8), hex (lowercase), Base64(hex). Ответ: число (ID заказа) или XML с тегом `<id>`.
- **Оплата картой:** используется SDPayIn (кубышка заказа, sector, id, amount, currency, sd_ref, url, failurl, signature). Purchase/PurchaseSBP с сайта не используются.
- **Приложение №2:** строка = значения параметров в порядке + password; SHA256(UTF-8); подпись = Base64(hex хэша в нижнем регистре).
- **Колбэк (Приложение №1 п.2, №3):** XML `<operation>`; подпись = конкатенация значений всех тегов по порядку + password. Ответ ТСП: `ok` (text/plain).

## Файлы

- `lib/payment/paygine/signature.ts` — Приложение №2 (подпись).
- `lib/payment/paygine/client.ts` — Register (Таблица 1), buildPurchaseFormParams (Таблица 2), buildPurchaseSBPFormParams (Таблица 44).
- `lib/payment/paygine-gateway.ts` — создание платежа (Register), приём webhook (проверка подписи, обновление транзакции).
- `lib/payment/stub-gateway.ts` — выбор шлюза (Paygine при заданных PAYGINE_SECTOR, PAYGINE_PASSWORD).
- `app/pay/redirect/page.tsx` — форма редиректа на webapi/Purchase или webapi/PurchaseSBP.
- `app/api/pay/redirect-proxy/route.ts` — прокси для обхода CSP (форма уходит на Paygine).
- `app/pay/result/page.tsx` — страница результата (success/fail по url/failurl из Заказа).

## Уведомления (webhook) и смена статусов

- При успехе или отказе оплаты Paygine отправляет POST на ваш `notify_url` (указан в Register). В теле — XML с тегами `reference`, `state`, `order_state`, `signature` и др.
- Мы обновляем транзакцию в SUCCESS при `state=APPROVED` или `order_state=COMPLETED`, иначе — в FAILED. В логах пишется `payment.webhook.processed` с transactionId и новым статусом.
- Если статусы заявок не меняются: 1) проверьте, что в ЛК Paygine указан верный URL (`/api/payment/webhook` или `/api/v1/webhooks/paygine`); 2) что URL доступен снаружи; 3) в логах — есть ли `payment.webhook.received` / `payment.webhook.processed` или `payment.webhook.signature_invalid`.

## Кубышки (sd_ref): приём, распределение, вывод на карту

Алгоритм по указанию Paygine:

1. **На каждого официанта** заранее регистрируется своя кубышка в Paygine; её номер хранится в `User.paygineSdRef`.
2. **На каждый заказ пополнения** создаётся отдельная кубышка заказа (временная): при создании платежа генерируется `paygineOrderSdRef` (например `1tips_t_<id>_<ts>`), в Register и SDPayIn передаётся этот sd_ref. Номер сохраняется в `Transaction.paygineOrderSdRef`.
3. **После зачисления средств** на кубышку заказа (успешный webhook) вызывается **распределение**: для каждого перевода — Register (новый заказ на перевод) → **SDRelocateFunds**(id, from_sd_ref=кубышка заказа, to_sd_ref=кубышка получателя). Для **СБП** при заданном `PAYGINE_SD_REF_LEGAL`: сначала перелив комиссии (fee) на кубышку ЮЛ, затем перелив (amount−fee) на кубышку официанта. Для **карты**: один перелив amount на кубышку официанта. Кубышка заказа обнуляется.
4. **Вывод на карту**: когда официант накопил на своей кубышке нужную сумму, инициируется операция вывода с кубышки официанта на карту — **SDPayOut**(sd_ref, pan, amount, …).

Для перевода с одной кубышки на другую **нужно зарегистрировать новый заказ** (Register), затем вызвать SDRelocateFunds с полученным orderId. Заказ на пополнение (старый orderId) для Relocate использовать нельзя (ПЦ возвращает 133).

**Реализация:**
- Создание платежа: `paygine-gateway.ts` — временная кубышка заказа, Register и SDPayIn с нею.
- Webhook при успехе: `paygine-gateway.ts` — Register (заказ на перевод) → `sdRelocateFunds` (кубышка заказа → кубышка официанта). Если у получателя не задан `paygineSdRef`, Relocate не вызывается.
- Вывод: `send-payout-to-paygine.ts` — если у пользователя задан `paygineSdRef` и в запросе передан `pan`, выполняется **SDPayOut** с кубышки на карту; иначе — цепочка СБП (Register → SBPCreditPrecheck → SBPCredit).
- Админ: `POST /api/admin/payouts/[id]/send-paygine` — тело обязательно: `{ "pan": "номер_карты" }`. Выполняется SDPayOut с кубышки официанта (paygineSdRef) на карту.

**Настройка:** постоянный sd_ref официанта присваивается при регистрации в ЛК (формат `FreeTips_w_<uniqueId>`). Существующим пользователям он проставляется миграцией `20260218100000_backfill_paygine_sd_ref`. В Paygine кубышка фактически создаётся при первом зачислении на неё (первый Relocate после пополнения).

## Безопасность

- В коде разрешены только хосты `test.paygine.com` и `pay.paygine.com` (`lib/payment/paygine/client.ts`). Любой другой `PAYGINE_BASE_URL` игнорируется, используется тестовый URL.
- Подпись колбэка проверяется по Приложению №3 (пароль ТСП не передаётся в запросах от клиента).

## Вывод средств (выплаты) и Paygine

### Что есть в нашем API

- **GET /api/payouts** — список заявок на вывод текущего пользователя (JWT или X-API-Key).
- **POST /api/payouts** — создание заявки: тело `{ "amountKop": number, "details": string, "recipientName"?: string }`. Проверяются баланс и лимиты; заявка создаётся со статусом `CREATED` (или сразу `COMPLETED` при автоподтверждении).
- **Админ: GET /api/admin/payouts** — список заявок (фильтр по статусу).
- **Админ: PATCH /api/admin/payouts/[id]** — смена статуса на `PROCESSING` | `COMPLETED` | `REJECTED`, опционально `externalId` (например ID операции в Paygine).
- **Админ: POST /api/admin/users/[id]/payout** — создать заявку от имени пользователя и сразу подтвердить (`COMPLETED`), тело `{ "amountKop": number, "details": string }`. Удобно для тестов.

**Важно:** эти эндпоинты только меняют данные в нашей БД. Они **не вызывают API Paygine**. Статус `COMPLETED` в приложении не означает, что деньги реально отправлены в Paygine — это учёт внутри 1tips.

### Что говорит Paygine про вывод

У Paygine есть возможность **выплат на карты** (PayOut) и P2P-переводы. Детальная документация по методам вывода (например, аналог SDPayOut в P2PMarket API) в открытом доступе не опубликована. Её нужно запрашивать у Paygine (сайт [paygine.ru](https://paygine.ru), раздел для партнёров/интеграции).

### По документу Оглавление1: привязка карты и вывод через редирект

В официальном документе «Интеграция с ПЦ» (Оглавление1.txt) описаны два потока, связанных с картой для вывода:

1. **Привязка карты (webapi/CardEnroll)** — Таблица 26  
   - ТСП отправляет запрос **webapi/CardEnroll** (GET или POST) с параметрами: **sector**, **id** (ID заказа из Register), **signature** (подпись: sector, id, password).  
   - **ПЦ перенаправляет плательщика на платёжную форму** для ввода карточных данных. Сумма берётся из заказа (рекомендуется случайная небольшая сумма для верификации карты).  
   - По результатам формируется операция AUTHORIZE; при успехе (state=APPROVED) **токен карты** приходит в XML-уведомлении. Рекомендуется затем откатить операцию (webapi/Reverse).  
   - Токен можно использовать для последующих операций без ввода карты (в т.ч. для вывода на карту, если ПЦ это поддерживает). Работа с токеном карты — по согласованию с Оператором.

2. **Зачисление на карту со счёта ТСП (gateweb/P2PCredit)** — Таблица 35  
   - Запрос **gateweb/P2PCredit**: зачисление средств на карту получателя со счёта ТСП (операция P2PCREDIT).  
   - **Условно-обязательно:** либо **id** заказа (из Register), либо связка **amount**, **currency**, **reference**.  
   - **Карта получателя:** обязательно указать либо **pan** (номер карты), либо **token** (токен ранее зарегистрированной карты, в т.ч. через CardEnroll).  
   - В примере в документе запрос выполняется в режиме **«сервер-сервер»** (POST с pan, amount, currency, signature) — редирект на платёжные страницы не используется. Ответ ПЦ — XML с результатом.  
   - Подпись: sector, id, amount, currency, pan, token, password (в порядке использования в запросе).

**В 1tips сейчас:** вывод реализован через **SDPayOut** (P2PMarket/Safe Deposit), а не через gateweb/P2PCredit. В SDPayOut передаётся **pan** в теле запроса (сервер-сервер), без редиректа на страницу ПЦ и без привязки карты (CardEnroll). При необходимости поддержки привязки карты и/или вывода через редирект на страницу Paygine нужно уточнять у Paygine доступность и параметры для вашего контура (SDPayOut vs P2PCredit, токены).

### Вывод на карту (SDPayOut)

В приложении используется только вывод с кубышки официанта на карту: **SDPayOut** (webapi/b2puser/sd-services/SDPayOut). Цепочка СБП (Register → SBPCreditPrecheck → SBPCredit) в приложении не используется.

#### SDPayOut и SDPayOutPage (редирект на страницу ПЦ)

По документу **docs/paygine/апи.md** (P2P Marketplace Services, Paygine):

**SDPayOutPage** — «Является аналогом webapi/b2puser/sd-services/SDPayOut с показом платежных страниц ПЦ.» Выплата со счета Кубышки на внешнюю карту выполняется **с перенаправлением Плательщика на Платёжные страницы ПЦ** (номер карты вводится на стороне ПЦ, не передаётся через сервер ТСП).

- **URL:** `POST /webapi/b2puser/sd-services/SDPayOutPage` (тот же хост, что и для SDPayIn, напр. `https://test.paygine.com/webapi/b2puser/sd-services/SDPayOutPage`).
- **Обязательные параметры:** `sector`, `id`, `signature`. Параметр **id** — уникальный идентификатор предварительно зарегистрированного Заказа в ПЦ (результат **webapi/Register**). В Register при этом должны быть указаны сумма, валюта, **sd_ref** (кубышка списания), url, failurl и т.д.
- **Условно-обязательные (для SDPayOutPage):** в Register должны быть переданы `sd_ref`, при необходимости `fee`, `url`, `failurl` (см. `docs/paygine/апи.md`, раздел Register — условно-обязательные для SDPayOutPage).
- **Подпись:** в формировании подписи участвуют параметры (если они использованы в запросе) в порядке: sector, id, token, client_ref, amount, currency, sd_ref, unique_key, password (см. Приложение №2 в `docs/paygine/апи.md`). Для минимального набора (sector, id, sd_ref): подпись от sector + id + sd_ref + password.
- **Необязательные в запросе SDPayOutPage:** reference, unique_key, fee, client_ref, token, pan, action (action=pay — попытка провести операцию без показа формы при достаточных данных).
- После успешной операции заказ переводится в статус COMPLETED; баланс Кубышки уменьшается на amount + fee. ПЦ перенаправляет на url/failurl с GET-параметрами (id заказа, операция, код ошибки при failurl).

**В 1tips сейчас:** редирект на SDPayOutPage не реализован. Используется только сервер-сервер SDPayOut с передачей pan в теле запроса. Чтобы добавить вывод через SDPayOutPage: 1) при создании заявки на вывод вызывать webapi/Register (amount, currency, sd_ref=paygineSdRef официанта, url, failurl, description, fee); 2) отдать пользователю форму POST на `{PAYGINE_BASE_URL}/b2puser/sd-services/SDPayOutPage` с полями sector, id, sd_ref, signature (и при необходимости fee, url, failurl); 3) обработать возврат на url/failurl (обновить статус заявки, показать результат).

**Документ:** полное описание — в проекте: `docs/paygine/апи.md` (P2P Marketplace Services).

**Два сценария:**

1. **Автовывод включён** (у пользователя `autoConfirmPayouts: true`, задан `paygineSdRef`, в приложении настроены Paygine): при создании заявки официантом из ЛК (`POST /api/payouts` с телом `amountKop`, `details`, опционально `pan`) запрос **сразу** отправляется в Paygine (SDPayOut). Если передан `pan` (номер карты) и Paygine настроен — вызывается `sendPayoutToPaygine`; при успехе заявка получает статус `COMPLETED`. Если Paygine вернул ошибку — заявка остаётся `CREATED`, клиенту возвращается 502 с описанием.
2. **Автовывод выключен**: вывод в Paygine только вручную из ЛК админа — кнопка «В Paygine» и ввод номера карты (`POST /api/admin/payouts/[id]/send-paygine` с телом `{ "pan": "..." }`).

**Ручная отправка (админ):** `POST /api/admin/payouts/[id]/send-paygine` (SUPERADMIN). Тело обязательно: `{ "pan": "номер_карты" }`. Требуется: у пользователя задан `paygineSdRef`. Выполняется SDPayOut(sd_ref, pan, amount, …).

**Клиент:** `lib/payment/paygine/client.ts` — `sdPayOut()` (вывод с кубышки на карту).

#### Формат запроса SDPayOut (по документации Paygine)

Чтобы запрос соответствовал документации (`docs/paygine/апи.md`, сервис webapi/b2puser/sd-services/SDPayOut, Приложение №2):

| Элемент | Значение |
|--------|----------|
| Метод | POST |
| URL | `{PAYGINE_BASE_URL}/b2puser/sd-services/SDPayOut` (baseUrl уже содержит `/webapi`, напр. `https://test.paygine.com/webapi`) |
| Content-Type | application/x-www-form-urlencoded |
| Параметры тела (порядок) | sector, sd_ref, pan, amount, currency, signature, description, fee (опционально) |
| Подпись | Строка: `sector` + `pan` + `amount` + `currency` + `sd_ref` + password → SHA256(UTF-8) → hex (lowercase) → Base64(hex). Реализация: `buildPaygineSignature([sector, pan, amount, currency, sd_ref], password)`. |

Параметры: **sector** — номер сектора; **sd_ref** — кубышка списания; **pan** — номер карты получателя (без пробелов); **amount** — сумма в копейках; **currency** — 643 (рубли); **description** — описание (обязательно, иначе ПЦ может вернуть 139); **fee** — комиссия в копейках (опц.); **signature** — подпись по формуле выше.

## Комиссии (Fee)

По документу (Оглавление1, Таблица 1): **fee не зачисляется на кубышку**. В Register передаём `amount` и `fee`; `amount` зачисляется на кубышку заказа, `fee` взимается с плательщика дополнительно и не поступает на баланс кубышки. Подпись Register: только **sector, amount, currency, password** (Приложение №2).

| Тип операции | Процент | Реализация |
|--------------|--------|------------|
| **Вывод на карту** (SDPayOut) | 1,2% | С кубышки списывается amount + fee, на карту зачисляется amount. Комиссия в `PayoutRequest.feeKop`, баланс = поступления − (amountKop + feeKop) по выполненным выплатам. |
| **Приём по QR (СБП)** | 2,5% | Register с `amount` и `fee`. После оплаты при переливе: **комиссия → кубышка ЮЛ** (`PAYGINE_SD_REF_LEGAL`), **остаток (amount−fee) → кубышка официанта**. Баланс официанта учитывает только зачисленное (amount−fee). |
| **Приём по номеру карты** | 4% | Register с `amount` и `fee`. После оплаты при переливе: **весь amount → кубышка официанта** (разделение комиссии на ЮЛ не делается). Баланс = полная сумма поступлений по карте. |

Константы и расчёт: `lib/payment/paygine-fee.ts`. Распределение fee на кубышку ЮЛ — только для СБП (продуктовая логика 1tips).
