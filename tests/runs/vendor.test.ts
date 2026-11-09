import { describe, expect, it } from "vitest";
import { navFor } from "@/components/app/app-nav";
import {
  canMarkDone,
  NO_VENDOR_TASKS,
  runsListViewFor,
  tasksVisibleTo,
  yourTasksLabel,
  type TaskStatus,
} from "@/lib/runs/domain";
import { templatesPageAccess } from "@/lib/templates/domain";

// Логіка сторінок зрізу 3 для вендора (openspec/specs/vendor-access). Що вендор бачить у базі, доводять тести бази
// (tests/db/vendor-access.test.ts); тут — що сторінка показує з того, що база віддала. Очікування — з «Тоді» AC PM.
const A = "manager-a";
const V = "vendor-v";
const vendor = { id: V, role: "vendor" as const };
const manager = { id: A, role: "manager" as const };

/** «Apartment 12, move-in»: 5 задач, задачі 3 і 4 — вендору V, решта — менеджеру A. */
const run12 = (status3: TaskStatus = "to_do") =>
  [1, 2, 3, 4, 5].map((n) => ({
    id: `task-${n}`,
    name: `Task ${n}`,
    assigneeId: n === 3 || n === 4 ? V : A,
    status: (n === 3 ? status3 : "to_do") as TaskStatus,
  }));

describe("vendor-access (pages)", () => {
  it('AC-VENDOR-03: the list of runs shows vendor V "Your tasks: 0 of 2 done" for "Apartment 12, move-in"', () => {
    expect(yourTasksLabel(run12(), V)).toBe("Your tasks: 0 of 2 done");
  });

  it("AC-VENDOR-04: vendor V sees exactly tasks 3 and 4 of the run, not tasks 1, 2 and 5", () => {
    expect(tasksVisibleTo(vendor, run12()).map((t) => t.id)).toEqual(["task-3", "task-4"]);
    // Менеджер запуску бачить увесь запуск, як і раніше.
    expect(tasksVisibleTo(manager, run12())).toHaveLength(5);
  });

  it('AC-VENDOR-05: after vendor V marks task 3 as done, V sees "Your tasks: 1 of 2 done"', () => {
    expect(yourTasksLabel(run12("done"), V)).toBe("Your tasks: 1 of 2 done");
    expect(canMarkDone(vendor, { runManagerId: A }, { assigneeId: V })).toBe(true);
  });

  it("AC-VENDOR-07: the page offers vendor V no way to mark task 1 of manager A", () => {
    expect(canMarkDone(vendor, { runManagerId: A }, { assigneeId: A })).toBe(false);
  });

  it('AC-VENDOR-08: vendor V on the list of templates gets "Not enough rights"', () => {
    const access = templatesPageAccess("vendor");
    expect(access).toMatchObject({ kind: "denied", message: "Not enough rights" });
    expect(templatesPageAccess("manager").kind).toBe("allowed");
    expect(templatesPageAccess(null).kind).toBe("login");
  });

  it('AC-VENDOR-08, AC-VENDOR-09: the navigation of vendor V has only "Runs" — no templates and no launching', () => {
    expect(navFor("vendor").map((i) => i.label)).toEqual(["Runs"]);
    expect(navFor("manager").map((i) => i.label)).toEqual(["Templates", "Runs", "Launch a template"]);
  });

  it('AC-VENDOR-10: vendor V with no task sees "No tasks assigned to you yet." and no empty table', () => {
    expect(NO_VENDOR_TASKS).toBe("No tasks assigned to you yet.");
    expect(runsListViewFor("vendor", 0)).toEqual({ kind: "empty", message: "No tasks assigned to you yet." });
    expect(runsListViewFor("vendor", 1)).toEqual({ kind: "table" });
    // Менеджер без запусків — як у зрізі 2 (AC-DSYS-04).
    expect(runsListViewFor("manager", 0)).toMatchObject({ kind: "empty", actionHref: "/runs/new" });
  });
});
