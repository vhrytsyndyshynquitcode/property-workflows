# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-20

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-RUN-01 | запуск — один запуск «in progress» з усіма 5 задачами «to do» | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-02 | зміна шаблону після запуску не змінює задачі запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_tasks — копія задач) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-03 | порожня назва випадку — «Enter a case name», запуску немає | `src/lib/runs/domain.ts` (validateCaseName), `supabase/migrations/20261020073540_workflow_runs.sql` (CASE_NAME_EMPTY) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-04 | 2 задачі — менеджеру B, решта 3 — менеджеру запуску A | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-05 | адміністратор, що запустив шаблон, — менеджер запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_manager_id) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-06 | менеджер A, що запустив шаблон, — менеджер запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_manager_id) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-07 | назва з 101 символу — «Case name must be at most 100 characters» | `src/lib/runs/domain.ts` (validateCaseName), `supabase/migrations/20261020073540_workflow_runs.sql` (CASE_NAME_TOO_LONG) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-08 | менеджер без призначень — виконавець усіх 5 задач | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-RUN-09 | адміністратор без призначень — виконавець усіх 5 задач | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-01 | виконавець позначає свою задачу «done» | `src/lib/runs/domain.ts` (markTaskDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-02 | менеджер запуску позначає чужу задачу свого запуску «done» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-03 | сторонній менеджер — відмова з повідомленням, задача «to do» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (NOT_ALLOWED) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-04 | третя обов'язкова задача «done» — запуск «completed» | `src/lib/runs/domain.ts` (runStatusFor), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-05 | сторінка запуску — прогрес «2 of 5 done» | `src/lib/runs/domain.ts` (progressLabel) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-06 | менеджер B бачить свій запуск і запуск A, де він виконавець | `src/lib/runs/domain.ts` (visibleRuns), `supabase/migrations/20261020073540_workflow_runs.sql` (can_see_run, runs_select_visible) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-07 | адміністратор позначає задачу в чужому запуску «done» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-08 | сторінка запуску — статус кожної з 5 задач | `src/lib/runs/domain.ts` (TASK_STATUS_LABEL) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
| AC-TASK-09 | список запусків — прогрес «2 of 5 done» | `src/lib/runs/domain.ts` (progressLabel) | `tests/runs/tasks.test.ts` | відкладено (UI — задача 2, impl-workflow-runs/tasks.md) |
