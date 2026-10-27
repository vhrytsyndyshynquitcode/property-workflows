import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Тести бази для уточнень PM 27.10 (openspec/specs/template-editor; міграція 20261027105115_editor_checks.sql).
// Назва — з AC ID PM; відмовні тести перевіряють і відмову, і незмінні дані (asService).
const TEMPLATE = "00000000-0000-4000-8000-000000000001"; // «Tenant move-in»: 2 розділи, 5 задач (3 обов'язкові)
const BEFORE_MOVE_IN = "00000000-0000-4000-8000-000000000101";
const MOVE_IN_DAY = "00000000-0000-4000-8000-000000000102";
// Запуск і менеджер, що існували до появи версій (AC-EDITOR-27).
const OLD_RUN = "c0000000-0000-4000-8000-000000000001";
const OLD_MANAGER = "b0000000-0000-4000-8000-000000000001";

let t: TestDb;
let ADMIN: string;
let MANAGER_B: string;

const count = async (sql: string, params: unknown[] = []) =>
  (await t.asService<{ n: number }>(`select (${sql})::int as n`, params))[0].n;
const versions = (template = TEMPLATE) =>
  count("select count(*) from public.template_versions where template_id = $1", [template]);
const unpublished = async (template = TEMPLATE) =>
  (await t.asService<{ f: boolean }>("select has_unpublished_changes as f from public.templates where id = $1", [template]))[0].f;
const newTemplate = async (name: string) =>
  (await t.asUser<{ id: string }>(ADMIN, "insert into public.templates (name) values ($1) returning id", [name]))[0].id;
const save = (template: string, user = ADMIN) => t.asUser(user, "select public.save_template_version($1)", [template]);

beforeAll(async () => {
  t = await createTestDb({
    beforeMigration: {
      "20261026084454_template_versions.sql": async (db) => {
        await db.exec(`
          insert into auth.users (id, email, raw_user_meta_data)
          values ('${OLD_MANAGER}', 'old-manager@example.test', '{"full_name":"Old manager"}');
          insert into public.runs (id, template_id, template_name, case_name, run_manager_id)
          values ('${OLD_RUN}', '${TEMPLATE}', 'Tenant move-in', 'Apartment 12, move-in', '${OLD_MANAGER}');
          insert into public.run_tasks (run_id, section_name, name, is_required, position, assignee_id)
          values ('${OLD_RUN}', 'Before move-in', 'Sign the lease', true, 1, '${OLD_MANAGER}');
        `);
      },
    },
  });
  ADMIN = t.users["admin@example.test"];
  MANAGER_B = t.users["member2@example.test"];
}, 60_000);

describe("template-editor oct27 (db)", () => {
  it('AC-EDITOR-27: a run launched before versions existed shows "Template version 1" and keeps its tasks', async () => {
    const [run] = await t.asService<{ number: number; tasks: number }>(
      `select v.number, (select count(*)::int from public.run_tasks where run_id = r.id) as tasks
       from public.runs r join public.template_versions v on v.id = r.template_version_id where r.id = $1`,
      [OLD_RUN],
    );
    expect(run).toEqual({ number: 1, tasks: 1 });
  });

  it('AC-EDITOR-02: manager B sees each task of version 1 marked "required" or "optional"', async () => {
    const tasks = await t.asUser<{ name: string; is_required: boolean }>(
      MANAGER_B,
      `select vt.name, vt.is_required from public.version_tasks vt
       join public.templates tp on tp.current_version_id = vt.version_id where tp.id = $1`,
      [TEMPLATE],
    );
    expect(tasks).toHaveLength(5);
    const labels = tasks.map((task) => (task.is_required ? "required" : "optional"));
    expect(labels.filter((l) => l === "required")).toHaveLength(3);
    expect(labels.filter((l) => l === "optional")).toHaveLength(2);
  });

  it("AC-EDITOR-12: saving a template with no unpublished changes creates no new version", async () => {
    expect(await unpublished()).toBe(false);
    await expect(save(TEMPLATE)).rejects.toThrow(/NO_CHANGES/);
    expect(await versions()).toBe(1);
  });

  it("AC-EDITOR-11: launching a template never saved as a version, directly, creates no run", async () => {
    const repair = await newTemplate("Repair");
    const before = await count("select count(*) from public.runs");
    await expect(
      t.asUser(ADMIN, "select public.launch_run($1, 'Apartment 3, repair', '{}'::jsonb)", [repair]),
    ).rejects.toThrow(/TEMPLATE_NOT_FOUND/);
    expect(await count("select count(*) from public.runs")).toBe(before);
  });

  it('AC-EDITOR-16: manager B gets nothing for a template never saved as a version ("Template not found")', async () => {
    const draft = await newTemplate("Inspection");
    const rows = await t.asUser(MANAGER_B, "select id, name from public.templates where id = $1", [draft]);
    expect(rows).toHaveLength(0);
  });

  it("AC-EDITOR-23: a new template with an existing name in other case and with spaces is not created", async () => {
    const before = await count("select count(*) from public.templates");
    await expect(newTemplate(" tenant MOVE-IN ")).rejects.toThrow(/templates_name_unique/);
    expect(await count("select count(*) from public.templates")).toBe(before);
  });

  it("AC-EDITOR-15: a section with no tasks blocks saving; changes and the notice are kept", async () => {
    const [section] = await t.asUser<{ id: string }>(
      ADMIN,
      "insert into public.template_sections (template_id, name, position) values ($1, 'After move-in', 3) returning id",
      [TEMPLATE],
    );
    await expect(save(TEMPLATE)).rejects.toThrow(/EMPTY_SECTION/);
    expect(await versions()).toBe(1);
    expect(await unpublished()).toBe(true);
    await t.asUser(ADMIN, "delete from public.template_sections where id = $1", [section.id]);
  });

  it("AC-EDITOR-20: a task name cleared to spaces is refused; no version is created and the unpublished changes stay", async () => {
    const [task] = await t.asUser<{ id: string; name: string }>(
      ADMIN,
      "select id, name from public.template_tasks where template_id = $1 order by position limit 1",
      [TEMPLATE],
    );
    // Задача: обмеження зрізу 1 не пускає порожню назву навіть у чернетку; сторінка показує «Every section and task
    // needs a name» (templateErrorCodeForDb → name_required).
    await expect(
      t.asUser(ADMIN, "update public.template_tasks set name = '   ' where id = $1", [task.id]),
    ).rejects.toThrow(/template_tasks_name_check/);
    const [{ name }] = await t.asService<{ name: string }>("select name from public.template_tasks where id = $1", [task.id]);
    expect(name).toBe(task.name);

    // Розділ: порожня назва лишається в неопублікованих змінах, а збереження версії відмовляє.
    await t.asUser(ADMIN, "update public.template_sections set name = '  ' where id = $1", [MOVE_IN_DAY]);
    await expect(save(TEMPLATE)).rejects.toThrow(/NAME_REQUIRED/);
    expect(await versions()).toBe(1);
    expect(await unpublished()).toBe(true);
    await t.asUser(ADMIN, "update public.template_sections set name = 'Move-in day' where id = $1", [MOVE_IN_DAY]);
  });

  it('AC-EDITOR-28: a task moved from "Move-in day" to "Before move-in" is saved in the new version there', async () => {
    // У сиді «Tenant move-in» — 3 і 2 задачі (у прикладі PM — 2 і 3); поведінка та сама: +1 і −1.
    const draftCount = (section: string) =>
      count("select count(*) from public.template_tasks where section_id = $1", [section]);
    const [beforeBefore, beforeMoveIn] = [await draftCount(BEFORE_MOVE_IN), await draftCount(MOVE_IN_DAY)];
    const [task] = await t.asUser<{ id: string }>(
      ADMIN,
      "select id from public.template_tasks where section_id = $1 order by position limit 1",
      [MOVE_IN_DAY],
    );
    await t.asUser(ADMIN, "update public.template_tasks set section_id = $2, position = 99 where id = $1", [task.id, BEFORE_MOVE_IN]);
    const [{ save_template_version: number }] = await save(TEMPLATE) as { save_template_version: number }[];
    expect(number).toBe(2);
    const sections = await t.asService<{ name: string; tasks: number }>(
      `select s.name, count(vt.id)::int as tasks from public.version_sections s
       join public.template_versions v on v.id = s.version_id
       left join public.version_tasks vt on vt.section_id = s.id
       where v.template_id = $1 and v.number = 2 group by s.name, s.position order by s.position`,
      [TEMPLATE],
    );
    expect(sections).toEqual([
      { name: "Before move-in", tasks: beforeBefore + 1 },
      { name: "Move-in day", tasks: beforeMoveIn - 1 },
    ]);
  });

  it("AC-EDITOR-29: manager B gets only the current version — not version 1, the list of versions or unpublished changes", async () => {
    // Неопубліковані зміни з 7 задачами поверх поточної версії 2.
    for (const name of ["Sign handover act", "Return spare keys"]) {
      await t.asUser(
        ADMIN,
        "insert into public.template_tasks (template_id, section_id, name, is_required, position) values ($1, $2, $3, false, 50)",
        [TEMPLATE, MOVE_IN_DAY, name],
      );
    }
    expect(await count("select count(*) from public.template_tasks where template_id = $1", [TEMPLATE])).toBe(7);

    const seenVersions = await t.asUser<{ number: number }>(
      MANAGER_B,
      "select number from public.template_versions where template_id = $1",
      [TEMPLATE],
    );
    expect(seenVersions.map((v) => v.number)).toEqual([2]);
    const versionOneTasks = await t.asUser(
      MANAGER_B,
      `select vt.id from public.version_tasks vt join public.template_versions v on v.id = vt.version_id
       where v.template_id = $1 and v.number = 1`,
      [TEMPLATE],
    );
    expect(versionOneTasks).toHaveLength(0);
    expect(await t.asUser(MANAGER_B, "select id from public.template_tasks where template_id = $1", [TEMPLATE])).toHaveLength(0);

    expect(await versions()).toBe(2);
    expect(await unpublished()).toBe(true);
    expect(await count("select count(*) from public.template_tasks where template_id = $1", [TEMPLATE])).toBe(7);
  });

  it('AC-EDITOR-14: a confirmed removal of "Move-in day" removes it and its tasks from the unpublished changes only', async () => {
    const draftTasksInSection = await count("select count(*) from public.template_tasks where section_id = $1", [MOVE_IN_DAY]);
    expect(draftTasksInSection).toBeGreaterThan(0);
    const versionOne = () =>
      t.asService<{ sections: number; tasks: number }>(
        `select (select count(*)::int from public.version_sections where version_id = v.id) as sections,
                (select count(*)::int from public.version_tasks where version_id = v.id) as tasks
         from public.template_versions v where v.template_id = $1 and v.number = 1`,
        [TEMPLATE],
      );
    const [before] = await versionOne();

    await t.asUser(ADMIN, "delete from public.template_sections where id = $1 and template_id = $2", [MOVE_IN_DAY, TEMPLATE]);

    expect(await count("select count(*) from public.template_sections where id = $1", [MOVE_IN_DAY])).toBe(0);
    expect(await count("select count(*) from public.template_tasks where section_id = $1", [MOVE_IN_DAY])).toBe(0);
    expect(await versionOne()).toEqual([before]);
    expect(before).toEqual({ sections: 2, tasks: 5 });
  });

  it("AC-EDITOR-26: a visitor who is not signed in cannot change the template or save a version directly; nothing changes", async () => {
    const before = await count("select count(*) from public.template_tasks where template_id = $1", [TEMPLATE]);
    await expect(t.asAnon("update public.templates set name = 'Hacked' where id = $1", [TEMPLATE])).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("insert into public.template_tasks (template_id, section_id, name, is_required, position) values ($1, $2, 'x', true, 1)", [TEMPLATE, MOVE_IN_DAY]),
    ).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select public.save_template_version($1)", [TEMPLATE])).rejects.toThrow(/permission denied/);
    expect(await versions()).toBe(2);
    expect(await count("select count(*) from public.template_tasks where template_id = $1", [TEMPLATE])).toBe(before);
    const [{ name }] = await t.asService<{ name: string }>("select name from public.templates where id = $1", [TEMPLATE]);
    expect(name).toBe("Tenant move-in");
  });
});
