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
// Мутанти на правила моїх 3 AC WS8 (AC-EDITOR-07, AC-EDITOR-09, AC-EDITOR-19; docs/qa/proof-pack.md).
// P1/P2 з materials/ не беремо: гарнес бази в репо вже є (tests/db/supabase-pglite.ts), а tests/db/profiles-db.test.ts
// з матеріалів немає. AC-EDITOR-07 — правило сторінки (adminPageAccess у src/lib/templates/domain.ts): його мутує
// Stryker (npm run mutation:ts), а в базі менеджер версії читати може — без них він не запустить шаблон.
const VERSIONS_SQL = "supabase/migrations/20261026084454_template_versions.sql";
const RUNS_SQL = "supabase/migrations/20261020073540_workflow_runs.sql";
const VERSIONS_DB = "tests/db/template-versions.test.ts";
const EDITOR_DB = "tests/db/template-editor-oct27.test.ts";

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
