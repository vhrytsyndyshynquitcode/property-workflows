# QA proof pack: зріз 3 — вендор і права доступу

<!--
Шаблон з koldovsky/2026-quitcode-09-software-factory-hw/materials/templates/proof-pack.template.md.
Proof pack WS8 (3 AC зрізу 2) — docs/qa/proof-pack-ws8.md. Посилання на файли — blob/main; у файлі здачі — на SHA.
-->

- Прод-URL: https://property-workflows-one.vercel.app
- Зріз 3: менеджер призначає вендора на задачу під час запуску; вендор бачить і виконує лише свої задачі; доступ кожної ролі тримає база (рядок WS8 Roadmap PM, реалізуємо у WS9).
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-11-02
- Спека: https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/openspec/specs/vendor-access/spec.md
- `/api/health` на момент UAT: sha `3f076f3`, db ok, 09.11.2026

## Доказ на кожен AC зрізу 3

Рівень: unit — `tests/runs/vendor.test.ts`; база (PGlite) — `tests/db/vendor-access.test.ts`; e2e — `tests/e2e/vendor.spec.ts`
(UAT на проді). «Здатен упасти» — SQL-мутанти `scripts/mutants.mjs` (`node scripts/mutation-check.mjs --kind sql --only V01,V02,V04,V06,V07,V08,V09`,
вивід — https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45). Вердикт — остаточний зі звіту UAT [`docs/qa/uat/2026-11-09/report.md`](uat/2026-11-09/report.md).

| AC | Вид | Тест (рівень, посилання) | Здатен упасти | Специфікація UAT | Вердикт UAT і кадр | PR |
|---|---|---|---|---|---|---|
| AC-VENDOR-01 | основний сценарій (запуск з вендором) | [база 55](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L55) | SQL-мутант V01 — KILLED | [`vendor.spec.ts#L61`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L61) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-01-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-02 | основний сценарій (вибір виконавця) | [база 64](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L64) | SQL-мутант V02 — KILLED | [`vendor.spec.ts#L92`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L92) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-02-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45 |
| AC-VENDOR-03 | список запусків вендора | [база 73](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L73), [unit 30](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L30) | SQL-мутант V04 — KILLED | [`vendor.spec.ts#L130`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L130) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-03-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-04 | відмова: чужі дані (чужі задачі в запуску) | [база 80](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L80), [unit 34](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L34) | SQL-мутант V04 — KILLED | [`vendor.spec.ts#L160`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L160) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-04-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-05 | основний сценарій (позначка своєї задачі) | [база 106](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L106), [база 136](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L136), [unit 40](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L40) | SQL-мутант V04 — KILLED (впав і AC-VENDOR-05) | [`vendor.spec.ts#L200`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L200) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-05-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-06 | відмова: чужі дані (чужий запуск за прямим посиланням) | [база 92](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L92) | SQL-мутанти V04, V06 — KILLED | [`vendor.spec.ts#L227`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L227) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-06-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-07 | відмова: заборонена дія напряму | [база 97](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L97), [unit 45](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L45) | SQL-мутант V07 — KILLED | [`vendor.spec.ts#L319`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L319) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-07-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45 |
| AC-VENDOR-08 | відмова: заборонена роль (шаблони) | [база 115](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L115), [unit 49](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L49) | SQL-мутант V08 — KILLED | [`vendor.spec.ts#L252`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L252) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-08-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-09 | відмова: заборонена дія напряму (запуск) | [база 124](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L124), [unit 56](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L56) | SQL-мутант V09 — KILLED | [`vendor.spec.ts#L279`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L279) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-09-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45, https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |
| AC-VENDOR-10 | стан інтерфейсу (порожній стан) | [unit 61](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L61) | — | [`vendor.spec.ts#L353`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L353) | PASS (R6), [кадр](uat/2026-11-09/frames/AC-VENDOR-10-then-1.png) | https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 |

## Не перевірено

| AC чи частина | Чому не перевірено | Що зроблено замість | Ризик на проді |
|---|---|---|---|
| AC-VENDOR-10: «здатен упасти» | порожній стан — сторінка й чиста функція, правила бази немає | unit [unit 61](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/runs/vendor.test.ts#L61) і UAT [`vendor.spec.ts#L353`](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/e2e/vendor.spec.ts#L353) | низький |
| Рішення до відповідей PM (#41, #44, #47) | PM ще не відповів: що ще бачить вендор на сторінці запуску, навігація вендора, форма запуску для вендора | зроблено за рекомендованими варіантами; позначено в `openspec/changes/impl-vendor-access/design.md` | зміна сторінки після відповіді PM |

## A. Вимоги й спека

- `/requirements-sync` — PR «Оновлення вимог»: https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/40 (знімок 2026-11-02); 09.11.2026 — «Вимоги актуальні» (PM вимог після 30.10 не змінював).
- Спека `add-vendor-access`: https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/41; план `impl-vendor-access`: https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/44.
- Зміна `clarify-vendor-access` після уточнень: PM AC не змінював (до кінця Пт 06.11 змін вимог немає).
- Питання PM: https://github.com/solomchaak/property-workflows-spec/issues/47 (моє); ті самі питання колег — #41, #44 (не дублював); журнал — `docs/spec-reading.md`.

## B. Реалізація

| PR «Реалізація» | Задача з `tasks.md` | AC | Відповіді на знахідки CodeRabbit | `db-deploy` |
|---|---|---|---|---|
| https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45 | 1. Роль вендора в базі | AC-VENDOR-01 … 09 | рев'ю CodeRabbit до злиття не відбулося (запит `@coderabbitai review` і `full review` без відповіді; «Review skipped/failed») — знахідок немає | https://github.com/vhrytsyndyshynquitcode/property-workflows/actions/runs/42589905094 («Apply migrations» — success) |
| https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/46 | 2. Сторінки вендора | AC-VENDOR-03 … 10 | рев'ю CodeRabbit до злиття не відбулося («Review failed: pull request is closed») | без міграцій |
| (цей PR) | 3. UAT і proof pack | AC-VENDOR-01 … 10 | — | без міграцій |

- Мутації: SQL — V01, V02, V04, V06, V07, V08, V09: 7 з 7 KILLED (V02, V04, V07, V08, V09 — у https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45; V01, V06 — у PR UAT зрізу 3).
- Знайдено під час реалізації (не CI): підтвердження останньої обов'язкової задачі сторінка рахувала з видимих задач — для вендора хибно; виправлено функцією бази `is_last_required_task` з тестом [база 136](https://github.com/vhrytsyndyshynquitcode/property-workflows/blob/main/tests/db/vendor-access.test.ts#L136) (https://github.com/vhrytsyndyshynquitcode/property-workflows/pull/45).

## C. UAT на проді

- Звіт: [`docs/qa/uat/2026-11-09/report.md`](uat/2026-11-09/report.md) — 13 AC (10 зрізу 3 + 3 WS8), PASS 13, FAIL 0, NEEDS-HUMAN 0.
- Відео: вкладення в описі PR UAT зрізу 3.
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5`; розбір — $0,0671 за цінами API.
- Негативний контроль (`npm run uat:nc`, 09.11.2026): NC-1 (навмисно хибний текст у твердженні) → **FAIL** (R1); NC-2 («уточнений» `ac-text`) → **NEEDS-HUMAN** (R3).
- Дані: `@writes` — синтетичні `uat-<прогін>-manager`, `-vendor`, `-idle-vendor@example.test`, запуски «Apartment 12, move-in» і «Apartment 14, repair» створює синтетичний менеджер; прибирання — видалено 3, лишилось 0, рядків, що лишились, — 0 (рядок «Прибирання» звіту).

## D. Ретро

[`docs/qa/retro-ws9.md`](retro-ws9.md)
