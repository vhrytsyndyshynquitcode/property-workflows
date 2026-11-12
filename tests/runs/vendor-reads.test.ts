import { describe, expect, it } from "vitest";
import { loadRunPage, loadRunsList, loadVendorRun, loadVendorRuns } from "@/lib/runs/vendor-reads";

// Читання даних вендора через функції бази (ADR 0008). Клієнт — підробка з відповідями rpc за назвою функції.
const V = "vendor-v";
type Rpc = { data: unknown; error: { message: string } | null };
const fake = (answers: Record<string, Rpc>) =>
  ({
    rpc: async (fn: string, args?: { p_run_id?: string }) => answers[args?.p_run_id ? `${fn}:${args.p_run_id}` : fn],
  }) as unknown as Parameters<typeof loadVendorRuns>[0];

const RUNS = [
  { id: "r-12", case_name: "Apartment 12, move-in", status: "in_progress" },
  { id: "r-10", case_name: "Apartment 10, repair", status: "completed" },
];
const TASK = { section_name: "Move-in day", name: "Hand over the keys", is_required: true, position: 3 };

describe("vendor-reads", () => {
  it("AC-VENDOR-03: the list of runs of vendor V carries own tasks per run and no template", async () => {
    const runs = await loadVendorRuns(
      fake({
        vendor_runs: { data: RUNS, error: null },
        vendor_tasks: {
          data: [
            { ...TASK, id: "t-3", run_id: "r-12", status: "done" },
            { ...TASK, id: "t-4", run_id: "r-12", status: "to_do" },
            { ...TASK, id: "t-9", run_id: "r-10", status: "done" },
          ],
          error: null,
        },
      }),
      V,
    );
    expect(runs.map((r) => [r.id, r.template_name, r.run_tasks])).toEqual([
      ["r-12", "", [{ status: "done", assignee_id: V }, { status: "to_do", assignee_id: V }]],
      ["r-10", "", [{ status: "done", assignee_id: V }]],
    ]);
  });

  it("AC-VENDOR-03: a failed read is an error, not an empty list of runs", async () => {
    const failed = { data: null, error: { message: "boom" } };
    await expect(loadVendorRuns(fake({ vendor_runs: failed, vendor_tasks: { data: [], error: null } }), V)).rejects.toEqual(failed.error);
    await expect(loadVendorRuns(fake({ vendor_runs: { data: RUNS, error: null }, vendor_tasks: failed }), V)).rejects.toEqual(failed.error);
  });

  it("AC-VENDOR-04: the run of vendor V has only V's tasks, with no run manager and no template", async () => {
    const run = await loadVendorRun(
      fake({
        vendor_runs: { data: RUNS, error: null },
        "vendor_tasks:r-12": { data: [{ ...TASK, id: "t-3", run_id: "r-12", status: "to_do" }], error: null },
      }),
      "r-12",
      V,
    );
    expect(run).toMatchObject({ id: "r-12", case_name: "Apartment 12, move-in", template_name: "", run_manager_id: "", template_version: null });
    expect(run?.run_tasks).toEqual([{ ...TASK, id: "t-3", run_id: "r-12", status: "to_do", assignee_id: V }]);
  });

  it("AC-VENDOR-03: pages read the functions for a vendor and the runs table for other roles", async () => {
    const tableRows = [{ id: "r-1", case_name: "Apartment 1", template_name: "Repair" }];
    const calls: string[] = [];
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: tableRows[0], error: null }), then: undefined as unknown };
    query.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: tableRows, error: null }).then(ok);
    const client = {
      from: (table: string) => (calls.push(`from:${table}`), query),
      rpc: async (fn: string) => (calls.push(`rpc:${fn}`), { data: [], error: null }),
    } as unknown as Parameters<typeof loadVendorRuns>[0];

    expect(await loadRunsList(client, "manager-a", false)).toEqual(tableRows);
    expect(await loadRunPage(client, "r-1", "manager-a", false)).toEqual(tableRows[0]);
    expect(calls).toEqual(["from:runs", "from:runs"]);

    calls.length = 0;
    expect(await loadRunsList(client, V, true)).toEqual([]);
    expect(await loadRunPage(client, "r-1", V, true)).toBeNull();
    expect(calls.every((c) => c.startsWith("rpc:vendor_"))).toBe(true);
  });

  it("AC-VENDOR-06: a run without a task of vendor V is not found, and a failed read is an error", async () => {
    const answers = { vendor_runs: { data: RUNS, error: null }, "vendor_tasks:r-14": { data: [], error: null } };
    expect(await loadVendorRun(fake(answers), "r-14", V)).toBeNull();
    const failed = { data: null, error: { message: "boom" } };
    await expect(loadVendorRun(fake({ ...answers, "vendor_tasks:r-14": failed }), "r-14", V)).rejects.toEqual(failed.error);
    await expect(loadVendorRun(fake({ ...answers, vendor_runs: failed }), "r-14", V)).rejects.toEqual(failed.error);
  });
});
