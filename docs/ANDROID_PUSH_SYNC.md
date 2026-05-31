# Android push sync: архитектура и гарантии

Документ описывает, как в Android-приложении устроены:

- синхронизация операций с API;
- отметки доставки push;
- защита от дублей и потерь;
- что происходит на новом устройстве/после оффлайна.

## Карта модулей

- `OperationsPagedSync` — page-fetch `/api/operations` (foreground/background).
- `OperationsSyncCoordinator` — единый вход для parsed operations.
- `TipNotificationSync` — правила дедупа/этапы pending -> delivered.
- `TipPushMarkStore` — постоянные отметки (`pending_tip_ids_json`, `delivered_tip_ids_json`).
- `BalanceNotificationHelper` — inbox + системный notify.
- `PushSyncMetrics` — локальные счётчики стабильности.

## Источники опроса

Опрос `/api/operations` запускается из трёх мест:

1. `HomeFragment` (foreground polling).
2. `TransactionsFragment` (экран истории).
3. `BalanceRefreshWorker` (background polling по alarm/work).

Чтобы уменьшить одновременные запросы, используется `PollJitter` (+0..5 секунд).

## Постраничная догрузка операций

Для push-sync используется `OperationsPagedSync`:

- размер страницы: `OperationsSync.FULL_HISTORY_LIMIT` (100);
- максимум страниц за цикл: `OperationsSync.MAX_PUSH_SYNC_PAGES` (20);
- stop-условия:
  - HTTP неуспех;
  - пустой body;
  - пустой список операций;
  - страница меньше лимита (конец данных).

Это снижает риск пропуска push после длительного оффлайна, когда новых операций > 100.

`OperationsSyncCoordinator` принимает уже распарсенные операции и передаёт их в `TipNotificationSync`.
Большинство этих модулей имеют `internal` visibility: снаружи используется только согласованный вход.

## Модель отметок push

Глобальный (между устройствами) источник истины:

- таблица БД `tip_push_deliveries` с уникальным ключом `(userId, tipId)`;
- Android перед отправкой push делает `POST /api/push/tips/claim`;
- только первый успешный `claim` получает право отправить push.

Локальные ключи в `SharedPreferences("balance_notification")`:

- `pending_tip_ids_json` — push подготовлен/должен быть отправлен;
- `delivered_tip_ids_json` — push доставлен и финализирован;
- `tips_bootstrap_done` — legacy-флаг совместимости.

Хранилище: `TipPushMarkStore`.

### Поток обработки tip

Для каждого `SUCCESS tip`:

1. Если `delivered` — пропускаем.
2. Иначе `markPending`.
3. Делаем серверный `claim` (`/api/push/tips/claim`).
4. Если `claimed=false` — на другом устройстве уже отправлено, помечаем `delivered` и выходим.
5. Если `claimed=true` — формируем текст push, пишем inbox, отправляем системный push.
6. `markDelivered` (pending -> delivered).

`TipNotificationSync.syncFromParsedOperations()` игнорирует пустые страницы и страницы без `SUCCESS tip`.

## Гарантии

### Дубли

- Глобальный дедуп по `tipId` на сервере (`tip_push_deliveries`).
- Повторная обработка не отправляет новый push для `delivered`.
- `TipNotificationSync` сериализует обработку через `synchronized(lock)`.

### Потери

- Если crash до `markPending`: tip будет обработан в следующем цикле.
- Если crash после `markPending`, но до `showSystemPush`: tip остаётся `pending`, следующий цикл повторит отправку.
- Если crash после `showSystemPush`, но до `markDelivered`: возможен редкий повтор push на следующем цикле (предпочтительнее silent-loss).

## Новый девайс / первая установка

Даже на новом устройстве исторические дубли между девайсами блокируются серверным `claim`.
Если push по `tipId` уже отправлялся на любом устройстве аккаунта, новое устройство его не отправит.

## Метрики стабильности

Локальные счётчики (`PushSyncMetrics`, `SharedPreferences("push_sync_metrics")`):

- `fetched`
- `pending_created`
- `delivered`
- `retry_from_pending`
- `skipped_delivered`
- `server_claim_conflict`
- `server_claim_error`

Используются для диагностики стабильности пайплайна на реальных устройствах.
