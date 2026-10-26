import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Тести бази зрізу 2 (міграція 20261026084454_template_versions.sql): RLS, GRANT і функції на справжньому Postgres
// (PGlite). Назва — з AC ID PM; відмовні тести перевіряють і відмову, і незмінні дані (asService).
const TEMPLATE = "00000000-0000-4000-8000-000000000001"; // «Tenant move-in» із міграції зрізу 1
const MOVE_IN_DAY = "00000000-0000-4000-8000-000000000102";

let t: TestDb;
let ADMIN: string;
let MANAGER_B: string;

type Tmpl = { current_version_id: string | null; has_unpublished_changes: boolean };
const template = async () =>
  (await t.asService<Tmpl & { versions: number; tasks: number }>(
    `select current_version_id, has_unpublished_changes,
            (select count(*)::int from public.template_versions v where v.template_id = t.id) as versions,
            (select count(*)::int from public.template_tasks k where k.template_id = t.id) as tasks
     from public.templates t where t.id = $1`,
    [TEMPLATE],
  ))[0];

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_B = t.users["member2@example.test"];
}, 60_000);

describe("template-versions (db)", () => {
  it("existing template becomes version 1 with 5 tasks and no unpublished changes (#33, assumption A)", async () => {
    const tmpl = await template();
    expect(tmpl.versions).toBe(1);
    expect(tmpl.has_unpublished_changes).toBe(false);
    const [v] = await t.asService<{ number: number; tasks: number }>(
      `select v.number, (select count(*)::int from public.version_tasks x where x.version_id = v.id) as tasks
       from public.template_versions v where v.id = $1`,
      [tmpl.current_version_id],
    );
    expect(v).toEqual({ number: 1, tasks: 5 });
  });

  it("AC-EDITOR-08: manager B cannot add a task, rename one or save a version directly; template unchanged", async () => {
    const before = await template();
    // Робоча копія: менеджеру політика insert не дозволяє (RLS), update не бачить рядків.
    await expect(
      t.asUser(
        MANAGER_B,
        "insert into public.template_tasks (template_id, section_id, name, is_required, position) values ($1, $2, 'Sign handover act', false, 9)",
        [TEMPLATE, MOVE_IN_DAY],
      ),
    ).rejects.toThrow(/row-level security/);
    const renamed = await t.asUser(MANAGER_B, "update public.template_tasks set name = 'Hacked' where template_id = $1 returning id", [TEMPLATE]);
    expect(renamed).toHaveLength(0);
    // Збереження версії — функція бази відмовляє не-адміністратору.
    await expect(t.asUser(MANAGER_B, "select public.save_template_version($1)", [TEMPLATE])).rejects.toThrow(/NOT_ALLOWED/);
    // Поточну версію напряму не змінити: column grant.
    await expect(
      t.asUser(MANAGER_B, "update public.templates set current_version_id = null where id = $1", [TEMPLATE]),
    ).rejects.toThrow(/permission denied/);

    const after = await template();
    expect(after).toEqual(before);
    expect(after.versions).toBe(1);
    expect(after.tasks).toBe(5);
    expect(after.has_unpublished_changes).toBe(false);
  });

  it("AC-EDITOR-08: a visitor who is not signed in gets nothing and changes nothing (#32, assumption A)", async () => {
    const before = await template();
    await expect(t.asAnon("select id from public.templates")).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select id from public.template_tasks")).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select public.save_template_version($1)", [TEMPLATE])).rejects.toThrow(/permission denied/);
    expect(await template()).toEqual(before);
  });

  it("AC-EDITOR-09: a visitor who is not signed in cannot read the content of a template", async () => {
    await expect(t.asAnon("select name from public.version_tasks")).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select name from public.template_sections")).rejects.toThrow(/permission denied/);
  });

  it("AC-EDITOR-01, AC-EDITOR-02: admin adds a sixth task — kept as unpublished; manager B still sees version 1 with 5 tasks", async () => {
    await t.asUser(
      ADMIN,
      "insert into public.template_tasks (template_id, section_id, name, is_required, position) values ($1, $2, 'Sign handover act', false, 9)",
      [TEMPLATE, MOVE_IN_DAY],
    );
    const tmpl = await template();
    expect(tmpl.has_unpublished_changes).toBe(true);
    expect(tmpl.tasks).toBe(6);

    // Менеджер: робочої копії не бачить, позначки (has_unpublished) немає у вибраних ним даних версії.
    expect(await t.asUser(MANAGER_B, "select id from public.template_tasks where template_id = $1", [TEMPLATE])).toHaveLength(0);
    const visible = await t.asUser<{ n: number }>(
      MANAGER_B,
      `select count(*)::int as n from public.version_tasks vt
       join public.templates tm on tm.current_version_id = vt.version_id where tm.id = $1`,
      [TEMPLATE],
    );
    expect(visible[0].n).toBe(5);
  });

  it("AC-EDITOR-03: saving creates version 2 with 6 tasks as current and clears the notice", async () => {
    const [saved] = await t.asUser<{ save_template_version: number }>(ADMIN, "select public.save_template_version($1)", [TEMPLATE]);
    expect(saved.save_template_version).toBe(2);
    const tmpl = await template();
    expect(tmpl.has_unpublished_changes).toBe(false);
    const [v] = await t.asService<{ number: number; tasks: number; created_by: string }>(
      `select v.number, v.created_by, (select count(*)::int from public.version_tasks x where x.version_id = v.id) as tasks
       from public.template_versions v where v.id = $1`,
      [tmpl.current_version_id],
    );
    expect(v).toEqual({ number: 2, tasks: 6, created_by: ADMIN });
  });

  it("AC-EDITOR-04: a new template with only optional tasks is not saved; it keeps its section, tasks and notice", async () => {
    const [repair] = await t.asUser<{ id: string }>(ADMIN, "insert into public.templates (name) values ('Repair') returning id");
    const [sec] = await t.asUser<{ id: string }>(
      ADMIN,
      "insert into public.template_sections (template_id, name, position) values ($1, 'Diagnosis', 1) returning id",
      [repair.id],
    );
    for (const [i, name] of ["Visit", "Photo", "Estimate"].entries()) {
      await t.asUser(
        ADMIN,
        "insert into public.template_tasks (template_id, section_id, name, is_required, position) values ($1, $2, $3, false, $4)",
        [repair.id, sec.id, name, i + 1],
      );
    }
    await expect(t.asUser(ADMIN, "select public.save_template_version($1)", [repair.id])).rejects.toThrow(/NO_REQUIRED_TASK/);
    const [after] = await t.asService<{ versions: number; sections: number; tasks: number; has_unpublished_changes: boolean; current_version_id: string | null }>(
      `select (select count(*)::int from public.template_versions v where v.template_id = t.id) as versions,
              (select count(*)::int from public.template_sections s where s.template_id = t.id) as sections,
              (select count(*)::int from public.template_tasks k where k.template_id = t.id) as tasks,
              t.has_unpublished_changes, t.current_version_id
       from public.templates t where t.id = $1`,
      [repair.id],
    );
    expect(after).toEqual({ versions: 0, sections: 1, tasks: 3, has_unpublished_changes: true, current_version_id: null });
    // Незбережений шаблон менеджер не бачить.
    expect(await t.asUser(MANAGER_B, "select id from public.templates where id = $1", [repair.id])).toHaveLength(0);
  });

  it("AC-EDITOR-06: a run launched from version 2 keeps version 2 and its tasks after version 3 is saved", async () => {
    const [run] = await t.asUser<{ launch_run: string }>(MANAGER_B, "select public.launch_run($1, 'Apartment 12, move-in', '{}'::jsonb)", [TEMPLATE]);
    await t.asUser(ADMIN, "update public.template_tasks set is_required = true where template_id = $1 and name = 'Sign handover act'", [TEMPLATE]);
    await t.asUser(ADMIN, "select public.save_template_version($1)", [TEMPLATE]);

    const [r] = await t.asUser<{ number: number; tasks: number }>(
      MANAGER_B,
      `select v.number, (select count(*)::int from public.run_tasks rt where rt.run_id = r.id) as tasks
       from public.runs r join public.template_versions v on v.id = r.template_version_id where r.id = $1`,
      [run.launch_run],
    );
    expect(r).toEqual({ number: 2, tasks: 6 });
  });

  it("AC-EDITOR-05: versions are numbered in order of saving and never reused", async () => {
    const rows = await t.asUser<{ number: number }>(
      ADMIN,
      "select number from public.template_versions where template_id = $1 order by created_at desc, number desc",
      [TEMPLATE],
    );
    expect(rows.map((r) => r.number)).toEqual([3, 2, 1]);
    // Версії незмінні: жодного grant на update / delete.
    await expect(t.asUser(ADMIN, "update public.template_versions set number = 9 where template_id = $1", [TEMPLATE])).rejects.toThrow(
      /permission denied/,
    );
  });
});
