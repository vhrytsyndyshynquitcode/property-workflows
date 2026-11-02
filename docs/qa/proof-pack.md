# QA proof pack: редактор шаблонів і дизайн-система (зріз 2)

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Заповнюється по кроках WS8 (A → B → C → D). Посилання — на файли на коміті, на PR і на прогони.
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
-->

- Прод-URL: https://property-workflows-one.vercel.app
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27
- `/api/health` на момент UAT: sha `104c72c`, db ok, 02.11.2026

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

Посилання — на `main` після злиття PR B; у файлі здачі — на SHA.

### Рівень для кожного AC

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-EDITOR-07 | сторінка `src/app/templates/[id]/versions/page.tsx` → `adminPageAccess` у `src/lib/templates/domain.ts` (не admin — відмова, запит версій не виконується). У базі менеджер версії читати **може**: без них він не запустить шаблон, тож SQL-правила «менеджер не бачить версій» немає | unit + e2e | рішення «хто бачить список» — чиста функція (unit, Stryker); «на екрані „Not enough rights“ і жодної версії» видно лише в браузері (e2e, крок C) | [`tests/templates/ui.test.ts#L129`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/templates/ui.test.ts#L129) |
| AC-EDITOR-09 | база: `revoke all … from anon` на шаблонах, робочій копії й версіях (`20261026084454_template_versions.sql:47-58`); proxy (`src/lib/supabase/proxy.ts`) і `currentUser()` ведуть на `/login` | база (PGlite) + unit + e2e | «без входу даних немає» — правило бази, доводимо на справжніх міграціях; «бачить сторінку входу» — e2e | [`tests/db/template-versions.test.ts#L76`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/template-versions.test.ts#L76), [`tests/templates/ui.test.ts#L135`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/templates/ui.test.ts#L135) |
| AC-EDITOR-19 | дія `createTemplate` (`src/app/templates/actions.ts:42-49`: порожня після `trim` назва → `?error=name_empty` без запису) + обмеження бази `templates_name_check` (`length(btrim(name)) > 0`, `20261020073540_workflow_runs.sql:50`) + текст у `TEMPLATE_MESSAGES` | unit (дія з підміненим клієнтом Supabase) + база (PGlite) + e2e | дія — перша лінія, база — друга (запит в обхід сторінок); дослівний текст на екрані — e2e | [`tests/templates/editor-actions.test.ts#L66`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/templates/editor-actions.test.ts#L66), [`tests/db/template-editor-oct27.test.ts#L108`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/template-editor-oct27.test.ts#L108), [`tests/templates/editor-oct27.test.ts#L61`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/templates/editor-oct27.test.ts#L61) |

### Покриття

`npm run test:coverage` (02.11.2026; разом — рядки 36 %, 155 з 428; загальний відсоток не поріг).

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/templates/domain.ts` (AC-EDITOR-07, 09, 19) | 96 % | 94 % | — (під підлогою 90/85/90/90) |
| `src/app/templates/actions.ts` (AC-EDITOR-19, `createTemplate`) | 28 % | 22 % | гілку AC-EDITOR-19 виконує `editor-actions.test.ts#L66`; решта дій — тести бази (`tests/db/**`) |
| `src/lib/supabase/proxy.ts` (AC-EDITOR-09) | 60 % | 87 % | редірект на `/login` — e2e (крок C) |
| `src/app/templates/[id]/versions/page.tsx` (AC-EDITOR-07) | 0 % | 0 % | e2e: `tests/e2e/templates.spec.ts` (крок C) |
| `src/app/templates/[id]/edit/page.tsx` (AC-EDITOR-09) | 0 % | 0 % | база (`template-versions.test.ts#L76`) + e2e (крок C) |
| `src/app/templates/new/page.tsx` (AC-EDITOR-19) | 0 % | 0 % | e2e (крок C) |

### Доказ мутацією

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| **E19** `supabase/migrations/20261020073540_workflow_runs.sql:50` `check (length(btrim(name)) > 0)` → `check (length(name) > 0)` | AC-EDITOR-19 («the name empty or consisting only of spaces … no template is created») | **SURVIVED** (на тестах `main`) | `tests/db/template-editor-oct27.test.ts#L108`: адміністратор вставляє `""` і `"   "` напряму → відмова `templates_name_check`, кількість шаблонів не змінилась | **KILLED** |
| **T19** `src/app/templates/actions.ts:46` `if (!name)` → `if (name === null)` | AC-EDITOR-19 («no template is created, and A sees the message "Enter a template name"») | **SURVIVED** (на тестах `main`) | `tests/templates/editor-actions.test.ts#L66`: `createTemplate` з `""` і `"   "` → `/templates/new`, текст «Enter a template name», жодного `insert` | **KILLED** |
| **E09** `supabase/migrations/20261026084454_template_versions.sql:58` + `grant select on template_sections, template_tasks to anon` | AC-EDITOR-09 («no content of the template») | — (тест уже був) | `tests/db/template-versions.test.ts#L76` (без змін) | **KILLED** |

- Stryker (`npm run mutation:ts -- --mutate src/lib/templates/domain.ts`): **87,59 %** (120 убито, 14 вижило, 3 без
  покриття) і до, і після. На рядках моїх AC (`adminPageAccess`, рядки 38–49; `templateMessageFor`, рядок 108) — 21
  убитий, 1 вижилий, і він еквівалентний (нижче). Решта вижилих — поза моїми AC: `reorderAfterMove` (рядки 144, 147;
  AC-EDITOR-01), `removalTarget` (133), `formatVersionDate` (67), `templateErrorCodeForDb` (102).
- Вижилих на рядках AC Stryker не дав, тому доказ — ручні мутанти T19 і E19 з «до» (вижив) і «після» (убитий).
- SQL-мутації (`npm run mutation:sql`, PGlite-гарнес `tests/db/supabase-pglite.ts`):

  | Мутант | AC | Статус |
  |---|---|---|
  | E09 | AC-EDITOR-09 | KILLED (впали AC-EDITOR-08 і AC-EDITOR-09 у `template-versions.test.ts`) |
  | E19 | AC-EDITOR-19 | KILLED |

- Еквівалентні мутанти: `src/lib/templates/domain.ts:108`, `typeof code === "string"` → `true`. `Object.hasOwn`
  зводить ключ до рядка (`null` → `"null"`, `1` → `"1"`), а серед ключів `MESSAGES_BY_CODE` таких немає, тож
  нерядкове значення однаково не дає повідомлення. Перевірка `typeof` лишається для типів TypeScript.

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-EDITOR-07 | [`tests/e2e/templates.spec.ts`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/templates.spec.ts) | passed | Haiku: PASS | **PASS** (R6) | [`AC-EDITOR-07-then-1.png`](uat/2026-11-02/frames/AC-EDITOR-07-then-1.png) |
| AC-EDITOR-09 | [`tests/e2e/templates.spec.ts`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/templates.spec.ts) | passed | Haiku: PASS | **PASS** (R6) | [`AC-EDITOR-09-then-1.png`](uat/2026-11-02/frames/AC-EDITOR-09-then-1.png) |
| AC-EDITOR-19 | [`tests/e2e/templates.spec.ts`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/templates.spec.ts) | passed | Haiku: NEEDS-HUMAN → Sonnet: PASS | **PASS** (R6) | [`then-1`](uat/2026-11-02/frames/AC-EDITOR-19-then-1.png), [`then-2`](uat/2026-11-02/frames/AC-EDITOR-19-then-2.png) |

- Звіт: [`docs/qa/uat/2026-11-02/report.md`](uat/2026-11-02/report.md), `manifest.json`, `frames/`
- Відео: вкладення в описі PR UAT (у git не кладемо)
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5`. Промпт і схема з `materials/` без змін. Розбір
  трьох AC коштує ≈ $0,05 за цінами API; за підпискою він іде в межах ліміту плану.
- Негативний контроль (`npm run uat:nc`, `tests/e2e/negative-controls.spec.ts`):
  - **NC-1** (AC-EDITOR-07): у тесті навмисно очікується «Access denied» → перевірка впала → **FAIL** (R1). Агент на кадрі
    бачив справжнє «Not enough rights» і сказав PASS, але впалу перевірку він не перекриває.
  - **NC-2** (AC-EDITOR-07): анотація `ac-text` з «уточненим» текстом («Only administrators can see versions»), тест і
    застосунок без змін → перевірки зелені, Haiku і Sonnet: FAIL → **NEEDS-HUMAN** (R3).
- Дані: лише читання. AC-EDITOR-19 відхиляє порожню назву ще до запису (кількість шаблонів до і після однакова).
  Прибирання: синтетичних `uat-*@example.test` видалено 0, лишилось 0.
- «Дано» AC-EDITOR-07 на проді: у «Tenant move-in» лише версія 1, а не 1 і 2. На «Тоді» це не впливає: відмова й
  «жодної версії» не залежать від кількості версій. Версію 2 на спільному проді не створюю, бо UAT лише читає.
- Що довелося змінити в матеріалах курсу (поза промптом і схемою рецензента):
  - `playwright.config.ts`: `reducedMotion: "reduce"`. WebGL-талісман на `/login` у headless Chromium без GPU
    гальмував кожну перевірку до 6–10 с.
  - `tests/e2e/support/uat.ts`: `attachRuntimeErrors` чекає відповіді на запит щонайбільше 5 с. Запит без відповіді
    тримав `afterEach` AC-EDITOR-19 до ліміту 60 с, і тест ставав FAIL, хоча обидва «Тоді» вже пройшли.
  - Середовище, не код: `claude` не був у PATH, бо Claude Code тут вбудований у Claude Desktop. До того ж зі
    скороченою текою `TEMP` (`C:\Users\OFFICE~1\…`) рецензент отримував відмову в читанні кадрів. Перший прогін тому
    й дав R2/R3. Повторний прогін з повним шляхом `TEMP` дав вердикти вище.

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-EDITOR-07 | <!-- PM --> | |
| AC-EDITOR-09 | <!-- PM --> | |
| AC-EDITOR-19 | <!-- PM --> | |

## D. Eval рецензента

<!-- заповнюється на кроці D -->
