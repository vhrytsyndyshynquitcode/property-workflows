// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — демо-репо курсу, scripts/mutants.mjs (тег ws8-02-tests); там 11 SQL- і 2 TS-мутанти.
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
//
// Мутанти на правила моїх 3 AC WS8 (AC-EDITOR-07, AC-EDITOR-09, AC-EDITOR-19; docs/qa/proof-pack-ws8.md).
// P1/P2 з materials/ не беремо: гарнес бази в репо вже є (tests/db/supabase-pglite.ts), а tests/db/profiles-db.test.ts
// з матеріалів немає. AC-EDITOR-07 — правило сторінки (adminPageAccess у src/lib/templates/domain.ts): його мутує
// Stryker (npm run mutation:ts), а в базі менеджер версії читати може — без них він не запустить шаблон.
const VERSIONS_SQL = "supabase/migrations/20261026084454_template_versions.sql";
const RUNS_SQL = "supabase/migrations/20261020073540_workflow_runs.sql";
const VERSIONS_DB = "tests/db/template-versions.test.ts";
const EDITOR_DB = "tests/db/template-editor-oct27.test.ts";
// Зріз 3 (WS9): роль вендора — міграція 20261109083715_vendor_access.sql і mark_task_done зрізу 1.
const VENDOR_SQL = "supabase/migrations/20261109083715_vendor_access.sql";
const VENDOR_DB = "tests/db/vendor-access.test.ts";

export const mutants = [
  {
    id: "E09", kind: "sql", ac: "AC-EDITOR-09", file: VERSIONS_SQL, tests: [VERSIONS_DB],
    what: "відвідувач без входу (anon) отримує select на робочу копію шаблону: розділи й задачі",
    find: "revoke all on table public.template_sections, public.template_tasks from anon, authenticated;",
    replace:
      "revoke all on table public.template_sections, public.template_tasks from anon, authenticated;\n" +
      "grant select on table public.template_sections, public.template_tasks to anon;",
  },
  {
    id: "E19", kind: "sql", ac: "AC-EDITOR-19", file: RUNS_SQL, tests: [EDITOR_DB],
    what: "назва шаблону: перевірка без btrim — назва лише з пробілів проходить",
    find: "name       text not null check (length(btrim(name)) > 0),",
    replace: "name       text not null check (length(name) > 0),",
  },
  {
    id: "T19", kind: "ts", ac: "AC-EDITOR-19", file: "src/app/templates/actions.ts",
    tests: ["tests/templates/editor-actions.test.ts"],
    what: "createTemplate: перевірка порожньої назви прибрана — назва йде в базу",
    find: 'if (!name) redirect("/templates/new?error=name_empty");',
    replace: 'if (name === null) redirect("/templates/new?error=name_empty");',
  },
  {
    id: "V04", kind: "sql", ac: "AC-VENDOR-04", file: VENDOR_SQL, tests: [VENDOR_DB],
    what: "run_tasks: вендор бачить усі задачі запуску, а не лише свої",
    find: "    and ((select private.current_app_role()) <> 'vendor' or assignee_id = (select auth.uid()))\n",
    replace: "",
  },
  {
    id: "V08", kind: "sql", ac: "AC-VENDOR-08", file: VENDOR_SQL, tests: [VENDOR_DB],
    what: "templates: шаблон з поточною версією бачить будь-хто з входом, зокрема вендор",
    find: "or ((select private.current_app_role()) = 'manager' and current_version_id is not null)",
    replace: "or current_version_id is not null",
  },
  {
    id: "V09", kind: "sql", ac: "AC-VENDOR-09", file: VENDOR_SQL, tests: [VENDOR_DB],
    what: "launch_run: запускати шаблон може й вендор",
    find: "v_role not in ('manager', 'admin') then",
    replace: "v_role not in ('manager', 'admin', 'vendor') then",
  },
  {
    id: "V07", kind: "sql", ac: "AC-VENDOR-07", file: RUNS_SQL, tests: [VENDOR_DB],
    what: "mark_task_done: вендор позначає будь-яку задачу запуску, де він виконавець хоча б однієї",
    find: "v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid",
    replace: "v_role in ('admin', 'vendor') or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid",
  },
  {
    id: "V02", kind: "sql", ac: "AC-VENDOR-02", file: VENDOR_SQL, tests: [VENDOR_DB],
    what: "list_assignable_users: вендорів немає у виборі виконавця",
    find: "and p.role in ('manager', 'admin', 'vendor')",
    replace: "and p.role in ('manager', 'admin')",
  },
  {
    id: "V01", kind: "sql", ac: "AC-VENDOR-01", file: VENDOR_SQL, tests: [VENDOR_DB],
    what: "launch_run: вендора не можна призначити виконавцем",
    find: "where p.id is null or p.role not in ('manager', 'admin', 'vendor')",
    replace: "where p.id is null or p.role not in ('manager', 'admin')",
  },
  {
    id: "V06", kind: "sql", ac: "AC-VENDOR-06", file: RUNS_SQL, tests: [VENDOR_DB],
    what: "can_see_run: вендор бачить усі запуски, як адміністратор",
    find: "select (select private.current_app_role()) = 'admin'",
    replace: "select (select private.current_app_role()) in ('admin', 'vendor')",
  },
];

// Приклади з демо (інша схема — у вашому репо цих файлів немає, тож не розкоментовуйте як є):
//
// SQL, межа з AC — діапазон напіввідкритий, останній день заявки не рахується:
//   { id: "L2", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
//     what: "перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець)",
//     find: "pg_catalog.daterange(p_start_date, p_end_date, '[]')",
//     replace: "pg_catalog.daterange(p_start_date, p_end_date, '[)')" },
//
// SQL, політика послаблена до true (а не видалена: без політики RLS забороняє все, і тест відмови лишився б зеленим):
//   { id: "L5", kind: "sql", ac: "передумова AC-LEAVE-04/10", file: LEAVE, tests: [LEAVE_DB],
//     what: "blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору",
//     find: "on public.blocked_days for insert to authenticated\n  with check ((select private.current_app_role()) = 'admin');",
//     replace: "on public.blocked_days for insert to authenticated\n  with check (true);" },
//
// Еквівалентний мутант — лише з reason, що посилається на рядок, який робить його зайвим:
//   { id: "L6", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
//     what: "політика рішень: прибрано role = 'manager'", expect: "survive",
//     reason: "еквівалентний: з 20261018000000_manager_helpers_require_role.sql private.is_division_manager() сама " +
//       "перевіряє current_app_role() = 'manager'", find: "…", replace: "…" },
//
// TS, точковий мутант на межі з AC (повний перебір TS — npm run mutation:ts, Stryker):
//   { id: "T1", kind: "ts", ac: "AC-LEAVE-11", file: "src/lib/leave/calendar.ts", tests: ["tests/leave/calendar.test.ts"],
//     what: "rangesOverlap: <= → <", find: "b.startDate <= a.endDate", replace: "b.startDate < a.endDate" },
