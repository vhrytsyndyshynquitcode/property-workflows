# QA proof pack: редактор шаблонів і дизайн-система (зріз 2)

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Заповнюється по кроках WS8 (A → B → C → D). Посилання — на файли на коміті, на PR і на прогони.
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
-->

- Прод-URL: https://property-workflows-one.vercel.app
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27
- `/api/health` на момент UAT: <!-- заповнюється на кроці C -->

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-EDITOR-07 | відмова в браузері (заборонена роль) | Then B sees the message "Not enough rights" and no versions. |
| AC-EDITOR-09 | відмова в браузері (не увійшов) | Then the visitor sees the sign-in page and no content of the template. |
| AC-EDITOR-19 | стан інтерфейсу (помилка з дослівним текстом) | Then no template is created, and A sees the message "Enter a template name". |

Усі три AC на проді лише читають: AC-EDITOR-19 відмовляє ще до запису (порожня назва не доходить до бази).

## A. Ворота

- PR воріт: <!-- …/pull/N -->
- Зелений `quality` на `main`: <!-- …/actions/runs/N -->
- Обов'язкові перевірки в `solo-main` з <!-- дата -->: «Ворота: fallow audit», «Покриття: доменна підлога»

Розбір першого повного прогону `fallow` 3.35.0 на `main` (`npx fallow --no-cache`, 02.11.2026). Ворота в CI —
`fallow audit` з `gate: new-only`: успадковані знахідки нижче не валять PR, нові — валять.

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| unused file `src/components/ui/dialog.tsx`, `select.tsx` | 2 | навмисна | лишено: компоненти дизайн-системи, внесені в `DESIGN.md` (розділ 5: «`Dialog`, `Select` — для клієнтських сценаріїв наступних зрізів»); прибрати чи використати — у зрізі, що їх потребує |
| unused file `src/lib/supabase/client.ts` | 1 | навмисна | лишено: браузерний клієнт Supabase шаблону курсу; клієнтських компонентів з даними поки немає (усе — server components і Server Actions) |
| unused file `src/lib/utils.ts` | 1 | навмисна | лишено: ціль аліасу `utils` у `components.json` — `npx shadcn add` генерує `import { cn } from "@/lib/utils"`; без файлу новий компонент не збереться |
| unused export `AC_ID_GLOBAL` (`scripts/lib/spec-lib.mjs:10`) | 1 | справжня (у скрипті шаблону) | лишено: скрипт шаблону курсу; зміни шаблону переносимо `git cherry-pick`, тож власна правка дала б конфлікт. У CI не валить (успадкована) |
| duplicate export `Role` (`src/lib/runs/domain.ts` ↔ `src/lib/templates/domain.ts`) | 1 | справжня | **виправлено в цьому PR:** `runs/domain.ts` імпортує тип `Role` з `templates/domain.ts`, сторінка запуску — теж |
| duplicate export `markTaskDone` (`src/app/runs/actions.ts` ↔ `src/lib/runs/domain.ts`) | 1 | навмисна | лишено: Server Action і чиста функція правила з однією назвою в різних шарах; між ними немає barrel-реекспорту, тож неоднозначного імпорту немає |
| дублі коду: `scripts/check-design-tokens.mjs` ↔ `scripts/check-server-boundary.mjs` | 3 групи | справжня, низький ризик | лишено: два незалежні архітектурні скрипти (обхід тек, читання файлів); спільний модуль — окремим PR, щоб не чіпати ворота `architecture` разом з цими |
| дублі коду в `src/app/templates/**`, `src/app/runs/[id]/page.tsx` | 5 груп | справжня, низький ризик | лишено: схожа розмітка форм редактора (задача / розділ) і рядок дати; винесення в компонент — рефакторинг поза WS8 |
| складність: `src/components/ui/mochi/*.js` (`createBlobCreature`, `createGPUFurSystem`, `update`, …) | 4 функції | навмисна | `health.ignore` у `.fallowrc.jsonc` з причиною: WebGL-код талісмана перенесено з демо «3D GPU Fur Simulation» майже без змін (ADR 0004); WebGL у Vitest не запускається, тож розбивати без тестів — ризик |
| складність і розмір: сторінки й дії `src/app/**` (`launchRun`, `markTaskDone`, `EditTemplatePage`, `NewRunPage`, `RunPage`, …) | 18 | справжня, але оцінка | лишено: CRAP рахується без файлу покриття (оцінка); правила цих сторінок доводять тести бази на PGlite (`tests/db/**`) і e2e (крок C), а не Vitest-покриття сторінок |
| складність: скрипти шаблону (`scripts/check-spec.mjs`, `check-design-tokens.mjs`, `check-server-boundary.mjs`, `create-demo-users.mjs`) | 8 | справжня (чужий код) | лишено: скрипти шаблону й наших воріт `architecture`; покриті тестами `tests/scripts/**` |
| hotspots, hidden change coupling (`globals.css` ↔ `components/ui/page.tsx`, `layout.tsx`) | 12 + 2 | інформація | лишено: тема й макет змінювались разом (ADR 0006, 0007) — зв'язок через CSS-токени, а не import |

Тестові правила лінтера (`@vitest/eslint-plugin` 1.6.27, `eslint-plugin-playwright` 2.12.1) — в `eslint.config.mjs` як
`error` (обов'язковий job `app`): `npm run lint` на нашому репо — **0 знахідок**, правил не вимикали.

Підлога покриття (`vitest.coverage.config.mts`, 90/85/90/90 на файл): `src/lib/templates/domain.ts` — єдиний доменний
файл, що її вже тримає. Нижче поки: `src/lib/auth/safe-next.ts` (інструкції 88,9 %), `src/lib/runs/domain.ts` (рядки
87 %), `src/lib/theme.ts` (рядки 83 %).

## B. Якість тестів

<!-- заповнюється на кроці B -->

## C. UAT на проді

<!-- заповнюється на кроці C -->

## D. Eval рецензента

<!-- заповнюється на кроці D -->
