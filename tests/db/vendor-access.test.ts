import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Тести бази для зрізу 3 — роль вендора (openspec/specs/vendor-access; міграція 20261109083715_vendor_access.sql).
// Назва — з AC ID PM; очікування — з «Тоді». Відмовні тести перевіряють і відмову, і незмінні дані (asService).
const TEMPLATE = "00000000-0000-4000-8000-000000000001"; // «Tenant move-in»: 2 розділи, 5 задач (поточна версія 1)

let t: TestDb;
let ADMIN: string;
let MANAGER_A: string;
let MANAGER_B: string;
let VENDOR: string;
/** id задач версії «Tenant move-in» у порядку запуску (позиції 1–5). */
let VERSION_TASKS: string[];
/** «Apartment 12, move-in»: задачі 3 і 4 — вендору V; «Apartment 14, repair»: жодної задачі V. */
let RUN_12: string;
let RUN_14: string;

const tasksOf = (runId: string) =>
  t.asService<{ id: string; position: number; assignee_id: string; status: string }>(
    "select id, position, assignee_id, status from public.run_tasks where run_id = $1 order by position",
    [runId],
  );
const runCount = async () =>
  (await t.asService<{ n: number }>("select count(*)::int as n from public.runs"))[0].n;
const launch = async (user: string, caseName: string, assignments: Record<string, string> = {}) =>
  (
    await t.asUser<{ launch_run: string }>(user, "select public.launch_run($1, $2, $3::jsonb)", [
      TEMPLATE,
      caseName,
      JSON.stringify(assignments),
    ])
  )[0].launch_run;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["member1@example.test"];
  MANAGER_B = t.users["member2@example.test"];
  VENDOR = t.users["pm-vendor@example.test"];
  VERSION_TASKS = (
    await t.asService<{ id: string }>(
      `select vt.id from public.version_tasks vt
       join public.version_sections s on s.id = vt.section_id
       join public.templates tp on tp.current_version_id = vt.version_id
       where tp.id = $1 order by s.position, vt.position, vt.id`,
      [TEMPLATE],
    )
  ).map((r) => r.id);
  RUN_12 = await launch(MANAGER_A, "Apartment 12, move-in", {
    [VERSION_TASKS[2]]: VENDOR,
    [VERSION_TASKS[3]]: VENDOR,
  });
  RUN_14 = await launch(MANAGER_A, "Apartment 14, repair");
}, 60_000);

describe("vendor-access (db)", () => {
  it("AC-VENDOR-01: manager A assigns vendor V to tasks 3 and 4 — tasks 3 and 4 have V, tasks 1, 2 and 5 have A", async () => {
    const tasks = await tasksOf(RUN_12);
    expect(tasks.map((x) => x.assignee_id)).toEqual([MANAGER_A, MANAGER_A, VENDOR, VENDOR, MANAGER_A]);
  });

  it("AC-VENDOR-02: manager A sees the emails of B, of the administrator and of V, and no names or roles", async () => {
    const rows = await t.asUser<Record<string, unknown>>(MANAGER_A, "select * from public.list_assignable_users()");
    const emails = rows.map((r) => r.email);
    expect(emails).toEqual(expect.arrayContaining(["member2@example.test", "admin@example.test", "pm-vendor@example.test"]));
    expect(Object.keys(rows[0]).sort()).toEqual(["email", "id"]);
    // Вендор сам email інших користувачів не бачить (матриця прав).
    expect(await t.asUser(VENDOR, "select * from public.list_assignable_users()")).toEqual([]);
  });

  it('AC-VENDOR-03: vendor V sees only the run "Apartment 12, move-in", with 2 own tasks, and not "Apartment 14, repair"', async () => {
    const runs = await t.asUser<{ case_name: string; status: string }>(VENDOR, "select case_name, status from public.runs");
    expect(runs).toEqual([{ case_name: "Apartment 12, move-in", status: "in_progress" }]);
    const own = await t.asUser<{ status: string }>(VENDOR, "select status from public.run_tasks where run_id = $1", [RUN_12]);
    expect(own.map((x) => x.status)).toEqual(["to_do", "to_do"]);
  });

  it("AC-VENDOR-04: vendor V sees exactly tasks 3 and 4 of the run, not tasks 1, 2 and 5", async () => {
    const visible = await t.asUser<{ position: number; assignee_id: string }>(
      VENDOR,
      "select position, assignee_id from public.run_tasks where run_id = $1 order by position",
      [RUN_12],
    );
    expect(visible.map((x) => x.position)).toEqual([3, 4]);
    expect(visible.every((x) => x.assignee_id === VENDOR)).toBe(true);
    // Менеджер запуску й далі бачить усі 5 задач.
    expect(await t.asUser(MANAGER_A, "select id from public.run_tasks where run_id = $1", [RUN_12])).toHaveLength(5);
  });

  it('AC-VENDOR-06: vendor V gets nothing of the run "Apartment 14, repair" in which V has no task', async () => {
    expect(await t.asUser(VENDOR, "select id from public.runs where id = $1", [RUN_14])).toEqual([]);
    expect(await t.asUser(VENDOR, "select id from public.run_tasks where run_id = $1", [RUN_14])).toEqual([]);
  });

  it('AC-VENDOR-07: vendor V marks task 1 of manager A directly — the request is refused and task 1 stays "to do"', async () => {
    const task1 = (await tasksOf(RUN_12))[0];
    await expect(t.asUser(VENDOR, "select public.mark_task_done($1)", [task1.id])).rejects.toThrow(/NOT_ALLOWED/);
    await expect(
      t.asUser(VENDOR, "update public.run_tasks set status = 'done' where id = $1", [task1.id]),
    ).rejects.toThrow(/permission denied/);
    expect((await tasksOf(RUN_12))[0].status).toBe("to_do");
  });

  it('AC-VENDOR-05: vendor V marks own task 3 as done — task 3 is "done", 1 of V\'s 2 tasks done', async () => {
    const task3 = (await tasksOf(RUN_12))[2];
    await t.asUser(VENDOR, "select public.mark_task_done($1)", [task3.id]);
    expect((await tasksOf(RUN_12))[2].status).toBe("done");
    const own = await t.asUser<{ status: string }>(VENDOR, "select status from public.run_tasks where run_id = $1", [RUN_12]);
    expect(own.filter((x) => x.status === "done")).toHaveLength(1);
    expect(own).toHaveLength(2);
  });

  it("AC-VENDOR-08: vendor V gets no template, no version and no content of a template", async () => {
    for (const table of ["templates", "template_versions", "version_sections", "version_tasks", "template_sections", "template_tasks"]) {
      expect(await t.asUser(VENDOR, `select * from public.${table}`), table).toEqual([]);
    }
    // Менеджер шаблон з поточною версією й далі бачить, адміністратор — усі.
    expect(await t.asUser(MANAGER_B, "select id from public.templates where id = $1", [TEMPLATE])).toHaveLength(1);
    expect(await t.asUser(ADMIN, "select id from public.templates where id = $1", [TEMPLATE])).toHaveLength(1);
  });

  it("AC-VENDOR-09: vendor V launches the template directly — no run is created and the list of runs does not change", async () => {
    const before = await runCount();
    await expect(launch(VENDOR, "Apartment 20, move-in")).rejects.toThrow(/NOT_ALLOWED/);
    await expect(
      t.asUser(VENDOR, "insert into public.runs (template_id, template_name, case_name, run_manager_id) values ($1, 'x', 'y', $2)", [
        TEMPLATE,
        VENDOR,
      ]),
    ).rejects.toThrow(/permission denied/);
    expect(await runCount()).toBe(before);
  });

  it("a vendor cannot make themselves a manager or an administrator", async () => {
    await expect(
      t.asUser(VENDOR, "update public.profiles set role = 'admin' where id = $1", [VENDOR]),
    ).rejects.toThrow(/permission denied/);
    const [{ role }] = await t.asService<{ role: string }>("select role from public.profiles where id = $1", [VENDOR]);
    expect(role).toBe("vendor");
  });
});
