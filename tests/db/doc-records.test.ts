import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Тести бази зрізу 4 (openspec/specs/doc-parsing; міграція 20261116161535_doc_records.sql). Назви — з AC ID PM.
// Відмовні тести перевіряють і відмову, і незмінні дані (asService).
const TEMPLATE = "00000000-0000-4000-8000-000000000001"; // «Tenant move-in»: 5 задач

let t: TestDb;
let ADMIN: string;
let MANAGER_A: string;
let MANAGER_B: string;
let VENDOR: string;
let RUN: string; // «Apartment 12, move-in» менеджера A: задача 1 — B, задачі 3 і 4 — вендору V

const REQUEST = { documentType: "maintenance_request", phone: "555-0101", description: "Kitchen tap drips", category: "plumbing", urgency: "urgent" };
const save = (user: string, values: object = REQUEST, type = "maintenance_request") =>
  t.asUser<{ id: string }>(user, "select public.save_doc_record($1, $2, $3::jsonb) as id", [RUN, type, JSON.stringify(values)]);
const recordCount = async () => (await t.asService<{ n: number }>("select count(*)::int as n from public.doc_records"))[0].n;
const canParse = async (user: string) =>
  (await t.asUser<{ ok: boolean }>(user, "select public.can_parse_documents($1) as ok", [RUN]))[0].ok;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["member1@example.test"];
  MANAGER_B = t.users["member2@example.test"];
  VENDOR = t.users["pm-vendor@example.test"];
  const tasks = (
    await t.asService<{ id: string }>(
      `select vt.id from public.version_tasks vt
       join public.version_sections s on s.id = vt.section_id
       join public.templates tp on tp.current_version_id = vt.version_id
       where tp.id = $1 order by s.position, vt.position, vt.id`,
      [TEMPLATE],
    )
  ).map((r) => r.id);
  RUN = (
    await t.asUser<{ id: string }>(MANAGER_A, "select public.launch_run($1, $2, $3::jsonb) as id", [
      TEMPLATE,
      "Apartment 12, move-in",
      JSON.stringify({ [tasks[0]]: MANAGER_B, [tasks[2]]: VENDOR, [tasks[3]]: VENDOR }),
    ])
  )[0].id;
}, 60_000);

describe("doc-records (db)", () => {
  it("AC-DOCAI-14: vendor V, an assignee of the run, may not parse documents of it", async () => {
    expect(await canParse(VENDOR)).toBe(false);
  });

  it("AC-DOCAI-15: manager B, an assignee but not the run manager, may not parse documents of the run", async () => {
    expect(await canParse(MANAGER_B)).toBe(false);
    // Менеджер запуску й адміністратор — можуть.
    expect(await canParse(MANAGER_A)).toBe(true);
    expect(await canParse(ADMIN)).toBe(true);
  });

  it("AC-DOCAI-04: run manager A saves the confirmed values — one record with the values, A's email and the time", async () => {
    const before = await recordCount();
    await save(MANAGER_A);
    const rows = await t.asUser<{ document_type: string; values: object; confirmed_by: string; confirmed_by_email: string; confirmed_at: string }>(
      MANAGER_A,
      "select document_type, \"values\", confirmed_by, confirmed_by_email, confirmed_at from public.doc_records where run_id = $1",
      [RUN],
    );
    expect(await recordCount()).toBe(before + 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ document_type: "maintenance_request", values: REQUEST, confirmed_by: MANAGER_A, confirmed_by_email: "member1@example.test" });
    expect(rows[0].confirmed_at).toBeTruthy();
  });

  it("AC-DOCAI-16: vendor V and manager B save values directly — refused, no record is saved", async () => {
    const before = await recordCount();
    await expect(save(VENDOR)).rejects.toThrow(/NOT_ALLOWED/);
    await expect(save(MANAGER_B)).rejects.toThrow(/NOT_ALLOWED/);
    await expect(
      t.asUser(VENDOR, "insert into public.doc_records (run_id, document_type, \"values\", confirmed_by, confirmed_by_email) values ($1, 'estimate', '{}', $2, 'x')", [RUN, VENDOR]),
    ).rejects.toThrow(/permission denied/);
    expect(await recordCount()).toBe(before);
  });

  it("AC-DOCAI-16: vendor V and manager B read no record of the run directly", async () => {
    expect(await t.asUser(VENDOR, "select * from public.doc_records")).toEqual([]);
    expect(await t.asUser(MANAGER_B, "select * from public.doc_records")).toEqual([]);
    // Адміністратор бачить записи будь-якого запуску.
    expect(await t.asUser(ADMIN, "select id from public.doc_records where run_id = $1", [RUN])).toHaveLength(1);
  });

  it("AC-DOCAI-04: an unknown document type or a non-object value is refused", async () => {
    const before = await recordCount();
    await expect(save(MANAGER_A, REQUEST, "invoice")).rejects.toThrow(/INVALID_VALUES/);
    await expect(
      t.asUser(MANAGER_A, "select public.save_doc_record($1, 'estimate', '[1,2]'::jsonb)", [RUN]),
    ).rejects.toThrow(/INVALID_VALUES/);
    expect(await recordCount()).toBe(before);
  });
});
