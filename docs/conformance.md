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

Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-DSYS-01 | ті самі слова й кольори статусів у списку й на сторінках запусків | `src/components/ui/status-badge.tsx`, `src/lib/runs/domain.ts` (RUN_STATUS_TONE), `src/app/runs/page.tsx`, `src/app/runs/[id]/page.tsx` | `tests/templates/ui.test.ts` | реалізовано |
| AC-DSYS-02 | менеджер у редакторі — «Not enough rights» і «Back to templates», шаблон без змін | `src/lib/templates/domain.ts` (adminPageAccess), `src/components/app/not-enough-rights.tsx`, `src/app/templates/[id]/edit/page.tsx`, `src/components/ui/page.tsx` (AppShell — той самий макет із бічною навігацією) | `tests/templates/ui.test.ts` | реалізовано |
| AC-DSYS-03 | відвідувач без входу на сторінці запуску — сторінка входу, без даних | `src/lib/templates/server.ts` (currentUser), `src/app/runs/[id]/page.tsx`, `src/app/login/page.tsx` | `tests/templates/ui.test.ts` | реалізовано |
| AC-DSYS-04 | порожній список запусків — «No runs yet. Launch a template to start one.» | `src/lib/runs/domain.ts` (runsListView), `src/app/runs/page.tsx` | `tests/templates/ui.test.ts` | реалізовано |
| AC-DSYS-05 | тема за пристроєм без вибору — темна, «Theme» показує «System» | — | — | відкладено (чекає реалізації) |
| AC-DSYS-06 | вибір «Light» зберігається на пристрої після перезапуску браузера | — | — | відкладено (чекає реалізації) |
| AC-DSYS-07 | статуси в темній темі — ті самі слова й кольори, контраст ≥ 4.5:1 | — | — | відкладено (чекає реалізації) |
| AC-DSYS-08 | вхід із прямого посилання — сторінка запуску, на яку вело посилання | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-01 | зміна в редакторі — «Unpublished changes», 6 задач після повернення | `supabase/migrations/20261026084454_template_versions.sql` (mark_template_unpublished), `src/app/templates/actions.ts`, `src/app/templates/[id]/edit/page.tsx` | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-02 | менеджер відкриває шаблон зі списку — версія 1 з 5 задачами, «required» / «optional», без неопублікованих змін | `supabase/migrations/20261026084454_template_versions.sql` (template_tasks_select_admin), `src/app/templates/[id]/page.tsx` | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-03 | збереження — «Version 2 saved», версія 2 з 6 задачами поточна, позначка зникає | `supabase/migrations/20261026084454_template_versions.sql` (save_template_version), `src/app/templates/actions.ts` (saveVersion) | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-04 | без обов'язкової задачі — «A template needs at least one required task», версії немає | `supabase/migrations/20261026084454_template_versions.sql` (NO_REQUIRED_TASK), `src/lib/templates/domain.ts` | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-05 | список версій — новіша першою, дата DD.MM.YYYY HH:MM, email автора | `src/lib/templates/domain.ts` (versionListRows, formatVersionDate), `src/app/templates/[id]/versions/page.tsx` | `tests/templates/ui.test.ts`, `tests/db/template-versions.test.ts` | реалізовано |
| AC-EDITOR-06 | запуск показує «Template version 1» і 5 задач версії 1 | `supabase/migrations/20261026084454_template_versions.sql` (launch_run), `src/app/runs/[id]/page.tsx` | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-07 | менеджер на списку версій — «Not enough rights», версій немає | `src/lib/templates/domain.ts` (adminPageAccess), `src/app/templates/[id]/versions/page.tsx` | `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-08 | прямий запит менеджера — шаблон у версії 1, без неопублікованих змін | `supabase/migrations/20261026084454_template_versions.sql` (RLS, column grants, save_template_version), `src/app/templates/actions.ts` (requireAdmin) | `tests/db/template-versions.test.ts` | реалізовано |
| AC-EDITOR-09 | відвідувач без входу в редакторі — сторінка входу, без вмісту | `supabase/migrations/20261026084454_template_versions.sql` (revoke anon), `src/lib/templates/server.ts` | `tests/db/template-versions.test.ts`, `tests/templates/ui.test.ts` | реалізовано |
| AC-EDITOR-10 | незбережений шаблон у формі запуску — недоступний, «Save the template to launch it» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-11 | прямий запит на запуск незбереженого шаблону — запуску немає | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-12 | збереження без неопублікованих змін — версії 3 немає | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-13 | видалення розділу, скасування на підтвердженні «This cannot be undone» — розділ лишається | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-14 | видалення розділу з підтвердженням — зник із неопублікованих змін, версія 1 без змін | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-15 | розділ без задач — «Every section needs at least one task», версії немає | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-16 | менеджер на незбереженому шаблоні — «Template not found» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-17 | менеджер без збережених шаблонів — «No templates yet. An administrator creates them.» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-18 | порожній список версій — «No versions yet. Save the template to create version 1.» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-19 | порожня назва нового шаблону — «Enter a template name» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-20 | задача без назви під час збереження — «Every section and task needs a name» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-21 | перейменування набуває чинності з версією 2 — менеджер бачить нову назву | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-22 | запуск показує назву шаблону своєї версії | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-23 | новий шаблон із наявною назвою (регістр, пробіли) — «A template with this name already exists» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-24 | перейменування на наявну назву — «A template with this name already exists», версії немає | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-25 | втрачене з'єднання — «Your last change was not kept. Try again.», задача на екрані | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-26 | прямий запит відвідувача на зміну шаблону — відхилено, сторінка входу, шаблон без змін | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-27 | запуск до появи версій — «Template version 1» | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-28 | перенесення задачі в інший розділ — нова версія: «Before move-in» 3 задачі, «Move-in day» 2 | — | — | відкладено (чекає реалізації) |
| AC-EDITOR-29 | прямий запит менеджера на старі версії — відхилено, лише поточна версія | — | — | відкладено (чекає реалізації) |
| AC-RUN-01 | запуск — один запуск «in progress» з усіма 5 задачами «to do» | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run), `src/app/runs/new/page.tsx` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-02 | зміна шаблону після запуску не змінює задачі запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_tasks — копія задач) | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-03 | порожня назва випадку — «Enter a case name», запуску немає | `src/lib/runs/domain.ts` (validateCaseName), `supabase/migrations/20261020073540_workflow_runs.sql` (CASE_NAME_EMPTY), `src/app/runs/actions.ts` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-04 | 2 задачі — менеджеру B, решта 3 — менеджеру запуску A | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run), `src/app/runs/new/page.tsx` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-05 | адміністратор, що запустив шаблон, — менеджер запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_manager_id) | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-06 | менеджер A, що запустив шаблон, — менеджер запуску | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (run_manager_id) | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-07 | назва з 101 символу — «Case name must be at most 100 characters» | `src/lib/runs/domain.ts` (validateCaseName), `supabase/migrations/20261020073540_workflow_runs.sql` (CASE_NAME_TOO_LONG), `src/app/runs/actions.ts` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-08 | менеджер без призначень — виконавець усіх 5 задач | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-09 | адміністратор без призначень — виконавець усіх 5 задач | `src/lib/runs/domain.ts` (buildRun), `supabase/migrations/20261020073540_workflow_runs.sql` (launch_run) | `tests/runs/launch.test.ts` | реалізовано |
| AC-TASK-01 | виконавець позначає свою задачу «done» | `src/lib/runs/domain.ts` (markTaskDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done), `src/app/runs/actions.ts` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-02 | менеджер запуску позначає чужу задачу свого запуску «done» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-03 | сторонній менеджер — відмова з повідомленням, задача «to do» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (NOT_ALLOWED), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-04 | третя обов'язкова задача «done» — запуск «completed» | `src/lib/runs/domain.ts` (markTaskDone, needsConfirmation), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done), `src/app/runs/actions.ts`, `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-05 | сторінка запуску — прогрес «2 of 5 done» | `src/lib/runs/domain.ts` (progressLabel), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-06 | менеджер B бачить свій запуск і запуск A, де він виконавець | `src/lib/runs/domain.ts` (visibleRuns), `supabase/migrations/20261020073540_workflow_runs.sql` (can_see_run, runs_select_visible), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-07 | адміністратор позначає задачу в чужому запуску «done» | `src/lib/runs/domain.ts` (canMarkDone), `supabase/migrations/20261020073540_workflow_runs.sql` (mark_task_done) | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-08 | сторінка запуску — статус кожної з 5 задач | `src/lib/runs/domain.ts` (TASK_STATUS_LABEL), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-RUN-10 | у виборі виконавця — лише email менеджерів і адміністраторів | `src/lib/runs/domain.ts` (assigneeOptions), `supabase/migrations/20261021073349_assignee_emails.sql`, `src/app/runs/new/page.tsx` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-11 | назва зі 100 символів і пробілом попереду — збережено без пробілу | `src/lib/runs/domain.ts` (validateCaseName), `supabase/migrations/20261020081209_runs_hardening.sql` | `tests/runs/launch.test.ts` | реалізовано |
| AC-RUN-12 | розділи запуску — як на момент запуску після зміни шаблону | `src/lib/runs/domain.ts` (buildRun, groupBySection), `supabase/migrations/20261020073540_workflow_runs.sql` (run_tasks.section_name), `src/app/runs/[id]/page.tsx` | `tests/runs/launch.test.ts` | реалізовано |
| AC-TASK-10 | чужий запуск за посиланням — «Run not found», задач не видно | `src/lib/runs/domain.ts` (RUN_NOT_FOUND, canSeeRun), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-11 | біля задачі — email виконавця, без імен і ролей | `src/lib/runs/domain.ts` (assigneeLabel), `supabase/migrations/20261021073349_assignee_emails.sql`, `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-12 | задачі двома групами за розділами в порядку розділів | `src/lib/runs/domain.ts` (groupBySection), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-13 | завершений запуск у списку — «completed», «4 of 5 done» | `src/lib/runs/domain.ts` (runListRows), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-14 | список — новіші першими, з назвою випадку й шаблону | `src/lib/runs/domain.ts` (runListRows), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-15 | позначка «required» / «optional» біля статусу | `src/lib/runs/domain.ts` (requiredLabel), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-16 | скасування на підтвердженні — задача «to do», запуск «in progress» | `src/lib/runs/domain.ts` (needsConfirmation, CONFIRM_NOTICE), `src/app/runs/actions.ts`, `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-17 | виконавець бачить у списку прогрес «2 of 5 done» | `src/lib/runs/domain.ts` (visibleRuns, progressLabel), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-18 | позначка «done» запропонована лише на своїх задачах | `src/lib/runs/domain.ts` (canMarkDone), `src/app/runs/[id]/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
| AC-TASK-09 | список запусків — прогрес «2 of 5 done» | `src/lib/runs/domain.ts` (progressLabel), `src/app/runs/page.tsx` | `tests/runs/tasks.test.ts` | реалізовано |
