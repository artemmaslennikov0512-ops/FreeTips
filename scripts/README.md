# Скрипты Paygine (кубышка)

Параметры берутся из **scripts/.env** (скопируй из `scripts/.env.example` и заполни).

---

## Скрипты в корне scripts/ (три основных)

| Скрипт | Назначение |
|--------|------------|
| **sd-get-balance.ts** | Проверка баланса кубышки (SDGetBalance). |
| **sd-topup-sbp.ts** | Пополнение по СБП сразу: Register + симуляция оплаты (test/SBPTestCase). Одна команда. |
| **sd-topup-card-auto.ts** | Пополнение картой сразу: Register + форма Paygine + автозаполнение карты (Playwright). |

### Проверка баланса

```bash
npx tsx scripts/sd-get-balance.ts
```

С указанием другой кубышки (переопределяет PAYGINE_SD_REF):

```bash
npx tsx scripts/sd-get-balance.ts 1tips_r_test
```

Успешный ответ (JSON): `balanceKop`, `balanceRub`, `sdRef`, `currency`, `sdState`, при наличии `availableBalanceKop`.

### Пополнение СБП (тестовый стенд)

Одна команда — регистрация заказа и подтверждение оплаты по СБП:

```bash
npx tsx scripts/sd-topup-sbp.ts 10000
```

(10000 = 100 ₽ в копейках.)

### Пополнение картой (авто)

Регистрация заказа и автозаполнение формы карты на Paygine (тестовая карта из .env):

```bash
npx tsx scripts/sd-topup-card-auto.ts 10000
```

В scripts/.env задать тестовую карту: `PAYGINE_TEST_PAN`, `PAYGINE_TEST_EXPIRY`, `PAYGINE_TEST_CVC`.  
`HEADLESS=0` — показать браузер при отладке.

---

## Утилиты (scripts/utils/)

Вспомогательные модули и скрипты для продвинутых сценариев.

- **load-env.ts** — подгружает `scripts/.env` в `process.env`.
- **last-topup.ts** — данные последнего пополнения (используется в sd-topup-card-auto и sd-payout).

Дополнительные скрипты (запуск при необходимости):

| Скрипт | Назначение |
|--------|------------|
| **utils/sd-register.ts** | Только регистрация заказа (Register), возвращает orderId. |
| **utils/sd-topup-card.ts** | Пополнение картой вручную: форма в браузере, ввод карты вручную. |
| **utils/sd-confirm.ts** | Подтверждение оплаты по СБП для уже зарегистрированного заказа. |
| **utils/sbp-test-case.ts** | Прямой вызов test/SBPTestCase по orderId. |
| **utils/sd-payout.ts** | Вывод с кубышки на карту (SDPayOut). |
| **utils/sd-relocate.ts** | Перевод между кубышками: Register (новый заказ на перевод) + SDRelocateFunds. Параметры: amount_kop, from_sd_ref, to_sd_ref. |
| **utils/sd-topup-card-direct.ts** | Пополнение картой без браузера (POST на SDPayIn). |
| **utils/sd-fund-order-card.ts** | HTML-форма SDPayIn для уже зарегистрированного orderId. |

---

## Методы оплаты и временная кубышка

### Какие методы вызываются при оплате

| Метод | Назначение |
|-------|------------|
| **Register** | Создание заказа в ПЦ. Параметры: sector, amount, currency, reference, url, failurl, **sd_ref** (кубышка, на которую ПЦ зачислит оплату), signature. Возвращает orderId. |
| **SDPayIn** | Оплата картой. POST-форма на Paygine с orderId, amount, currency, **sd_ref** (должен совпадать с Register), url, failurl, signature. Пользователь вводит карту на странице ПЦ. |
| **SDPayInSBP** | Оплата по СБП. Аналогично: orderId, amount, currency, **sd_ref**, url, failurl, signature. Редирект на страницу СБП ПЦ. |
| **SDRelocateFunds** | Перенос средств заказа с одной кубышки на другую. Параметры: id (orderId), **from_sd_ref**, **to_sd_ref**, signature. Вызывается после успешной оплаты. |

В Register и в SDPayIn/SDPayInSBP передаётся один и тот же **sd_ref** — кубышка, на которую ПЦ зачисляет платёж по этому заказу.

### Что нужно для сценария «временная кубышка → перенос»

Чтобы после оплаты переводить деньги на кубышку получателя (Relocate), цепочка должна быть такой:

1. **Register** с **временной** кубышкой: `sd_ref: "1tips_t_<uuid>"` (уникальная на транзакцию).
2. **Оплата** — SDPayIn (карта) или SDPayInSBP (СБП) с **тем же** sd_ref (временная кубышка). Деньги в ПЦ зачисляются на неё.
3. **SDRelocateFunds** после успешной оплаты (по вебхуку): `from_sd_ref` = эта временная кубышка, `to_sd_ref` = кубышка получателя.

Так сделано в приложении: `lib/payment/paygine-gateway.ts` (Register с `tempSdRef`), страница `/pay/go` подставляет в форму SDPayIn/SDPayInSBP `tx.sdRef` (временная), вебхук вызывает Relocate. Для таких заказов ручной `sd-relocate.ts` с тем же `from` тоже проходит.

### Почему в скриптах не временная кубышка и почему 133

Скрипты **sd-topup-sbp** и **sd-topup-card-auto** делают Register и SDPayIn/SDPayInSBP сразу с **целевой** кубышкой из .env (`PAYGINE_SD_REF`): деньги сразу попадают на неё, отдельного переноса нет. Так сделано намеренно:

- Для СБП: при попытке «временная → Relocate» в тесте (SBPTestCase) ПЦ возвращал **133** даже с паузой — тестовый СБП не переводит заказ в состояние, при котором Relocate разрешён.
- Для карты: скрипт тоже использует целевую кубышку, чтобы пополнение «в один клик» работало без вебхука и без Relocate.

Поэтому заказы, созданные **скриптами** (и СБП, и картой), при вызове `sd-relocate.ts` дают **133**: в ПЦ заказ уже привязан к одной кубышке с момента Register, перенос для такого сценария не предусмотрен. Успешный Relocate только у заказов, созданных **через приложение** (оплата по ссылке с временной кубышкой).

---

## Переменные scripts/.env

Обязательные:

- `PAYGINE_BASE_URL` — например `https://test.paygine.com`
- `PAYGINE_SECTOR` — идентификатор сектора
- `PAYGINE_PASSWORD` — пароль для подписи (из ЛК Paygine)
- `PAYGINE_SD_REF` — номер кубышки

Для sd-topup-card-auto: `PAYGINE_TEST_PAN`, `PAYGINE_TEST_EXPIRY`, `PAYGINE_TEST_CVC`.  
Для sd-topup-sbp: те же PAYGINE_* и при необходимости REGISTER_URL, REGISTER_FAILURL, REGISTER_APP_URL.  
См. `scripts/.env.example`.
