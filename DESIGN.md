# Дизайн-система: Property workflows

- **Джерело:** AI-агент — Claude Code (Claude Opus 5.5) за шаблоном `materials/DESIGN.template.md` курсу; промпт — в описі
  PR дизайн-системи. Значення OKLCH підібрано під «Вигляд і тон» PM, контраст пораховано скриптом (WCAG 2.x,
  OKLCH → sRGB → відносна яскравість), таблиця — у розділі 2.
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-26,
  solomchaak/property-workflows-spec#1) і вимога «Use one design system across the application»
  (`requirements/19-use-one-design-system.md`, AC-DSYS-01…04).
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (shadcn/ui, стиль base-nova); перевірка —
  `npm run check:design`.

## 1. Огляд

Внутрішній робочий інструмент агенції з управління житловою нерухомістю: менеджер і адміністратор запускають процеси за
шаблонами й відстежують задачі. Працюють переважно за робочим столом, іноді з телефона. Тон — **спокійний, діловий,
точний**: без жартів, знаків оклику, звинувачень («You made a mistake») і жаргону. Щільність важливіша за простір:
менеджер переглядає багато запусків, тож таблиці щільні, але читабельні на телефоні. Інтерфейс — англійською.

## 2. Кольори

Семантичні токени з іменами shadcn/ui, значення — OKLCH. У сторінках — лише класи з колонки «Клас»; ніколи hex,
`bg-[#…]` чи сирі палітри (`zinc-500`, `bg-white`). Тема — за вибором «Theme» (System / Light / Dark, типово System — за пристроєм; AC-DSYS-05, AC-DSYS-06, ADR 0007):
темні значення — `:root[data-theme="dark"]`, варіант `dark:` — за тим самим атрибутом.

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `oklch(0.99 0.003 250)` / `oklch(0.22 0.02 255)` | `oklch(0.17 0.01 255)` / `oklch(0.96 0.005 255)` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | картки, шапка, панелі | `oklch(1 0 0)` / `oklch(0.22 0.02 255)` | `oklch(0.21 0.012 255)` / `oklch(0.96 0.005 255)` | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | меню, діалоги | як `card` | як `card` | `bg-popover` |
| `primary` / `primary-foreground` | **одна** основна дія екрана (Launch, Save, Sign in) — акцент, більше ні для чого | `oklch(0.47 0.17 290)` / `oklch(0.99 0 0)` | `oklch(0.72 0.14 290)` / `oklch(0.17 0.01 255)` | `bg-primary`, `text-primary-foreground`, `text-primary` (посилання) |
| `secondary` / `secondary-foreground` | другорядна дія, вибраний шаблон | `oklch(0.95 0.008 255)` / як `foreground` | `oklch(0.27 0.012 255)` / як `foreground` | `bg-secondary` |
| `muted` / `muted-foreground` | приглушене тло, підписи, порожні стани | `oklch(0.955 0.006 255)` / `oklch(0.47 0.02 255)` | `oklch(0.26 0.01 255)` / `oklch(0.74 0.015 255)` | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | наведення, вибраний рядок | `oklch(0.94 0.012 255)` / як `foreground` | `oklch(0.28 0.015 255)` / як `foreground` | `bg-accent` |
| `destructive` / `destructive-foreground` | незворотна дія (лише з підтвердженням «This cannot be undone»), текст помилки | `oklch(0.52 0.2 27)` / `oklch(0.99 0 0)` | `oklch(0.7 0.18 25)` / `oklch(0.17 0.01 255)` | `bg-destructive`, `text-destructive` |
| `border` | розділювачі, межі карток | `oklch(0.88 0.008 255)` | `oklch(0.32 0.012 255)` | `border-border` |
| `input` | межа поля вводу | `oklch(0.6 0.02 255)` | `oklch(0.55 0.02 255)` | `border-input` |
| `ring` | кільце фокусу | як `primary` | як `primary` | `ring-ring` |
| `status-todo` / `-foreground` | статус «to do» — нейтральний сірий | `oklch(0.93 0.005 255)` / `oklch(0.35 0.02 255)` | `oklch(0.3 0.01 255)` / `oklch(0.88 0.01 255)` | `bg-status-todo`, `text-status-todo-foreground` |
| `status-progress` / `-foreground` | «in progress» — синій | `oklch(0.93 0.04 250)` / `oklch(0.4 0.14 255)` | `oklch(0.3 0.07 255)` / `oklch(0.86 0.08 250)` | `bg-status-progress`, `text-status-progress-foreground` |
| `status-done` / `-foreground` | «done», «completed» — зелений | `oklch(0.93 0.05 150)` / `oklch(0.38 0.11 150)` | `oklch(0.3 0.06 150)` / `oklch(0.87 0.1 150)` | `bg-status-done`, `text-status-done-foreground` |
| `status-draft` / `-foreground` | «Unpublished changes» — теплий жовтий | `oklch(0.94 0.07 90)` / `oklch(0.4 0.09 70)` | `oklch(0.32 0.06 85)` / `oklch(0.9 0.1 90)` | `bg-status-draft`, `text-status-draft-foreground` |

Талісман Mochi-Puff (ADR 0004) — 3D-ілюстрація на WebGL з власними кольорами хутра (пресет «Sakura Mochi»:
фіолетова основа, рожеві кінчики — у тон з `primary`). Це не токени: шейдери не читають CSS-змінних, тож кольори
записано в `src/components/ui/mochi/scene.ts` і більше ніде не вживаються — ні для тексту, ні для статусу, ні для дії.
Талісман декоративний (`aria-hidden`), норма контрасту для нього не діє.

Акцент `primary` — фіолетовий, щоб не збігатися з жодним кольором статусу (сірий, синій, зелений, жовтий, червоний).

### Контраст

Пораховано для кожної пари (WCAG 2.x). Текст ≥ 4.5:1, межі полів і фокус ≥ 3:1.

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 16.82 | 17.02 | ≥ 4.5 |
| `muted-foreground` на `background` | 6.63 | 8.30 | ≥ 4.5 |
| `muted-foreground` на `card` | 6.82 | 7.69 | ≥ 4.5 |
| `primary-foreground` на `primary` | 7.14 | 7.40 | ≥ 4.5 |
| `destructive` на `card` | 6.11 | 6.12 | ≥ 4.5 |
| `destructive-foreground` на `destructive` | 5.94 | 6.60 | ≥ 4.5 |
| `status-todo-foreground` на `status-todo` | 9.19 | 9.50 | ≥ 4.5 |
| `status-progress-foreground` на `status-progress` | 7.57 | 8.93 | ≥ 4.5 |
| `status-done-foreground` на `status-done` | 7.85 | 9.32 | ≥ 4.5 |
| `status-draft-foreground` на `status-draft` | 7.88 | 9.45 | ≥ 4.5 |
| `input` на `card` | 3.94 | 3.65 | ≥ 3 |
| `ring` на `background` | 7.14 | 7.40 | ≥ 3 |

## 3. Типографіка

Шрифт — Geist (`next/font`, `--font-geist-sans`) із системним запасом; числа прогресу — `tabular-nums`.

| Роль | Клас | Де |
|---|---|---|
| Заголовок сторінки | `text-2xl font-semibold` | один `h1` на сторінку (`PageHeader`) |
| Заголовок розділу | `text-base font-semibold` | розділ шаблону чи запуску (`h2`) |
| Основний текст | `text-sm` | таблиці, форми, задачі |
| Підпис, допоміжний текст | `text-sm text-muted-foreground` | email виконавця, «required/optional», опис сторінки |

Мінімальний розмір тексту — `text-xs` лише в бейджах статусу; «small grey text» для змісту не використовуємо.

## 4. Відступи й радіуси

- Робочі сторінки: бічна панель зліва `md:w-60` (назва, навігація, «Sign out» унизу); на телефоні — та сама навігація
  верхньою смугою. Вхід і 404 — проста шапка з назвою.
- Ширина контенту — `max-w-4xl`, бокові відступи `px-4` (телефон) / `sm:px-6`, вертикальні — `py-8`.
- Між блоками сторінки — `gap-6`; у формі — `gap-5` між полями, `gap-2` між `Label` і полем.
- Радіус `--radius: 0.5rem`; похідні — `rounded-md` (бейдж), `rounded-lg` (поля, кнопки, картки).

## 5. Компоненти й варіанти

Лише з `@/components/ui`. Нові — `npx shadcn@latest add <назва>` (або власні на токенах у цій теці).

| Компонент | Варіанти | Правило |
|---|---|---|
| `AppShell`, `PageHeader` (`page.tsx`) | — | кожна сторінка, зокрема вхід і відмови: та сама навігація, ширина й місце для повідомлень (AC-DSYS-02, AC-DSYS-03); робочі сторінки — бічна панель (ADR 0005), спокійне тло `bg-background` без градієнтів і анімацій (ADR 0006) |
| `NavLinks` | `vertical`, `horizontal` | пункти навігації; поточний розділ — `bg-primary/12 text-primary` і `aria-current="page"` |
| `ThemeSelect` | — | вибір «Theme»: System / Light / Dark (AC-DSYS-05, AC-DSYS-06); у макеті кожної сторінки, зокрема на вході; вибір — на пристрої (ADR 0007) |
| `MochiPuff` | — | талісман: пухнаста 3D-істота (WebGL, three.js), що стежить очима за курсором; наведення — «погладити» хутро, клік — «бупнути»; поки фокус у полі пароля — заплющує очі й не дивиться на курсор; **лише** вхід і 404, на робочих екранах його немає (ADR 0006); three.js вантажиться ліниво; при `prefers-reduced-motion` — один статичний кадр |
| `Button` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` | `default` — одна основна дія на екран; `destructive` — лише з підтвердженням; текст кнопки починається з дієслова |
| `buttonVariants` на `Link` | як `Button` | навігаційна дія, що виглядає як кнопка («Launch a template») |
| `Input` + `Label` | — | у кожного поля `Label` з `htmlFor`; placeholder — приклад, не підпис |
| `NativeSelect` | — | вибір виконавця у формах server actions |
| `Card` | — | групи вмісту: форма, розділ запуску, профіль |
| `Table` | — | список запусків; на телефоні другорядна колонка (шаблон) переходить під назву випадку |
| `StatusBadge` | `todo`, `progress`, `done`, `draft` | статус — завжди слово поруч із кольором (AC-DSYS-01) |
| `Badge` | `default`, `secondary`, `outline` | службові позначки, не статуси |
| `Alert` | `default`, `destructive` | `destructive` — помилка дії; `default` — відмова, підтвердження; текст дослівно з AC |
| `Dialog`, `Select` | — | для клієнтських сценаріїв наступних зрізів |

## 6. Стани

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список | рамка `border-border bg-card` + `text-muted-foreground` + дія, без порожньої таблиці | «No runs yet. Launch a template to start one.» + «Launch a template» (AC-DSYS-04) |
| Помилка дії | `Alert variant="destructive"` над кнопкою; форма лишається | «Enter a case name» (AC-RUN-03), «A template needs at least one required task» (AC-EDITOR-04) |
| Відмова в доступі | той самий `AppShell`, `Alert` з текстом і посиланням назад, без даних | «Not enough rights» + «Back to templates» (AC-DSYS-02, AC-EDITOR-07) |
| Не знайдено | той самий `AppShell`, `Alert`, без даних | «Run not found» (AC-TASK-10) |
| Сторінки немає (404) | той самий `AppShell`, `MochiPuff`, заголовок і дія назад | «Page not found» + «Go to home» |
| Не ввійшов | сторінка входу в тому самому `AppShell` | «Sign in» (AC-DSYS-03, AC-EDITOR-09) |
| Незворотна дія | `Alert` з назвою об'єкта, «This cannot be undone», `Button destructive` «Confirm» і `outline` «Cancel» | AC-TASK-04, AC-TASK-16 |
| Неопубліковані зміни | `StatusBadge tone="draft"` | «Unpublished changes» (AC-EDITOR-01) |
| Успіх | `Alert` (default) на сторінці, без спливних вікон | «Version 2 saved» |
| Завантаження | серверний рендер; кнопки форм без анімацій | — |

## 7. Доступність — мінімум

- `Label` у кожного поля; помилка поля пов'язана з полем (`aria-describedby`), якщо помилка стосується поля.
- Видимий фокус: `focus-visible:ring-ring/50` і `border-ring` на кожному інтерактивному елементі; Tab проходить форму
  по порядку.
- Контраст — таблиця в розділі 2.
- Статус ніколи не лише кольором — поруч завжди слово статусу.
- Спершу семантичний HTML (`<button>`, `<table>`, `<label>`, `<nav aria-label>`); `aria-*` — там, де HTML бракує.
- Без іконок без підпису, декоративних анімацій і градієнтів («Вигляд і тон» PM: «bright gradients, decorative
  animation» не підходять). Єдиний виняток — ілюстрація-талісман `MochiPuff` на неробочих екранах (вхід, 404;
  ADR 0004, 0006); при `prefers-reduced-motion` — нерухома. Робочі екрани (шаблони, запуски, задачі) — без
  градієнтів, анімацій і талісмана.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` для однієї основної дії | `bg-zinc-900 text-white`, `bg-[#0f6b6e]`, `style={{ color: "#…" }}` |
| `StatusBadge tone="progress"` + «in progress» | кольорова крапка без тексту |
| компонент `Button` з потрібним варіантом | власний `<button className="…">` у сторінці |
| текст повідомлення дослівно з AC PM | перефразоване «Oops! Something broke!» |
| `Alert` на сторінці для успіху й помилок | спливні toast-вікна для рутинної інформації |
| новий токен через розділ 9 | новий колір «лише для цієї сторінки» |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, контраст.
2. `src/app/globals.css`: `--<назва>` у `:root` і в `:root[data-theme="dark"]`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною (зараз — жодного).
- Візуально: знімки `/login` і `/runs` у світлій і темній темі (`docs/img/ws7-before-*`, `docs/img/ws7-after-*`),
  Tab по формі, контраст.

> Тема: з уточненням PM 27.10 (AC-DSYS-05…07) світла й темна теми — у вимогах. Перемикач «Theme» (`ThemeSelect`) —
> у макеті кожної сторінки, зокрема на вході; вибір зберігається на пристрої (`localStorage`), скрипт у `<head>` ставить
> `data-theme` до першого кадру (ADR 0007).
