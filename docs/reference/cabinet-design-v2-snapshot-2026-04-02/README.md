# Снимок ЛК «design-v2» (2 апр. 2026)

Здесь лежит **полный вариант** пилотного оформления личного кабинета официанта (`data-cabinet-theme="design-v2"`), который был в репозитории до отката к основному дизайну.

## Файлы в этой папке

| Файл | Был в проекте как |
|------|-------------------|
| `globals.css` | `app/globals.css` (включая все правила `[data-cabinet-theme="design-v2"]` и `:not(design-v2)` в селекторах) |
| `cabinet-theme-logins.ts` | `config/cabinet-theme-logins.ts` (`CABINET_DESIGN_V2_LOGINS`, `isCabinetDesignV2Theme`) |
| `layout.tsx` | `app/cabinet/layout.tsx` |
| `page.tsx` | `app/cabinet/page.tsx` |
| `support-page.tsx` | `app/cabinet/support/page.tsx` |
| `verification-page.tsx` | `app/cabinet/verification/page.tsx` |
| `settings-page.tsx` | `app/cabinet/settings/page.tsx` |
| `transactions-page.tsx` | `app/cabinet/transactions/page.tsx` |
| `link-page.tsx` | `app/cabinet/link/page.tsx` |

## Как вернуть эксперимент позже

1. Смержить/скопировать фрагменты из `globals.css` обратно в `app/globals.css` (удобнее диффом против текущего файла).
2. Восстановить `config/cabinet-theme-logins.ts` из снимка или заново добавить `CABINET_DESIGN_V2_LOGINS` и `isCabinetDesignV2Theme`.
3. Заменить содержимое страниц и `layout.tsx` из соответствующих файлов снимка (переименовать `*-page.tsx` в `page.tsx` при копировании).

Пилот включался по логину из множества `CABINET_DESIGN_V2_LOGINS` (в снимке — например `test1112`).

## Текущее состояние репозитория

После отката: только тема **M5** (`m5-competition`) и стандартный ЛК без `design-v2`.

Папка `docs/reference` **исключена из `tsconfig.json`**, чтобы копии `.ts`/`.tsx` в снимке не участвовали в сборке Next.js. Если перенесёте снимок в другое место под `**/*.tsx`, верните проверку типов или переименуйте расширения (например `.tsx.txt`).
