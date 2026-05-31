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

Ключи в `SharedPreferences("balance_notification")`:

- `pending_tip_ids_json` — push подготовлен/должен быть отправлен;
- `delivered_tip_ids_json` — push доставлен и финализирован;
- `tips_bootstrap_done` — завершён первый bootstrap устройства.

Хранилище: `TipPushMarkStore`.

### Поток обработки tip

Для каждого `SUCCESS tip`:

1. Если `delivered` — пропускаем.
2. Иначе `markPending`.
3. Формируем текст push (gross-сумма, округление до рубля).
4. Пишем запись в локальный inbox.
5. Отправляем системный push.
6. `markDelivered` (pending -> delivered).

`TipNotificationSync.syncFromParsedOperations()` игнорирует пустые страницы и страницы без `SUCCESS tip`.

## Гарантии

### Дубли

- Дедуп по `tipId`.
- Повторная обработка не отправляет новый push для `delivered`.
- `TipNotificationSync` сериализует обработку через `synchronized(lock)`.

### Потери

- Если crash до `markPending`: tip будет обработан в следующем цикле.
- Если crash после `markPending`, но до `showSystemPush`: tip остаётся `pending`, следующий цикл повторит отправку.
- Если crash после `showSystemPush`, но до `markDelivered`: возможен редкий повтор push на следующем цикле (предпочтительнее silent-loss).

## Новый девайс / первая установка

На первом sync (`tips_bootstrap_done=false`) текущие tip-id помечаются `delivered` без push.
Это не шлёт «исторические» уведомления за период до установки.

## Метрики стабильности

Локальные счётчики (`PushSyncMetrics`, `SharedPreferences("push_sync_metrics")`):

- `fetched`
- `pending_created`
- `delivered`
- `retry_from_pending`
- `skipped_delivered`

Используются для диагностики стабильности пайплайна на реальных устройствах.
