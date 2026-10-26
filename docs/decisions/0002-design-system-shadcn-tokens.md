# 0002. Дизайн-система: shadcn/ui (base-nova) на семантичних токенах OKLCH

- Статус: прийнято
- Дата: 2026-10-26
- AC: AC-DSYS-01, AC-DSYS-02, AC-DSYS-03, AC-DSYS-04

## Контекст

Вимога solomchaak/property-workflows-spec#19: усі сторінки однакові — статус тими самими словами й кольором
(AC-DSYS-01), відмова й вхід у тому самому макеті (AC-DSYS-02, AC-DSYS-03), порожні стани з текстом (AC-DSYS-04);
«Вигляд і тон» PM задає кольори за змістом. Сторінки зрізу 1 мали 40 сирих класів Tailwind (`zinc-*`, `red-600`).
Агенти без правил вигадують кольори щоразу наново. Стек — Next.js 16, Tailwind 4 (без PostCSS-конфігу).

## Рішення

- `DESIGN.md` — правила вигляду; `CLAUDE.md` імпортує `@DESIGN.md`, `AGENTS.md` — розділ «Дизайн-система».
- Токени в `src/app/globals.css`: семантичні пари shadcn/ui + статуси домену `status-todo` / `-progress` / `-done` /
  `-draft`, OKLCH, світла тема й темна за `prefers-color-scheme` (без `.dark`), `@theme inline` з `--color-*`.
- Компоненти — shadcn/ui CLI 4.22.1, стиль `base-nova` (Base UI) у `src/components/ui`, плюс власні на токенах:
  `StatusBadge`, `AppShell` / `PageHeader`, `NativeSelect`, `NativeCheckbox`. Нові залежності: `@base-ui/react`,
  `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn` (версії — `package-lock.json`).

## Розглянуті варіанти

- **Власні компоненти на Tailwind без бібліотеки** — чому ні: доступність (фокус, ролі, діалоги) довелося б писати й
  перевіряти самим; агенти краще знають API shadcn/ui.
- **Інша бібліотека компонентів зі своєю темою (MUI, Chakra)** — чому ні: власна система тем і CSS-in-JS поруч із
  Tailwind 4, Server Components потребують окремих обгорток, токени довелося б дублювати.
- **Radix-стиль shadcn замість base-nova** — рівноцінний; лишили дефолт CLI, щоб `shadcn add` не потребував прапорців.

## Наслідки

- Простіше: однакові кнопки, поля, таблиці й статуси; новий екран агент збирає з `@/components/ui`.
- Складніше: `shadcn add` компонента зі своїми CSS-змінними (sidebar, chart) знову додає `.dark` і `@custom-variant
  dark` — їх треба прибирати (правило в `AGENTS.md`); нові залежності оновлюємо лише з ADR.

## Як перевіряємо

- `npm run check:design` — job «Дизайн-система: лише токени» у `.github/workflows/architecture.yml`: жодного hex,
  `bg-[#…]`, сирої палітри чи кольору в inline style поза `src/components/ui` і `globals.css`.
- Тести логіки з AC ID у `tests/templates/ui.test.ts` (AC-DSYS-01…04) і скріни `docs/img/ws7-after-*`.
