import { describe, expect, it } from "vitest";
import {
  assigneeLabel,
  canMarkDone,
  canSeeRun,
  CONFIRM_NOTICE,
  groupBySection,
  markTaskDone,
  MESSAGES,
  progressLabel,
  requiredLabel,
  RUN_NOT_FOUND,
  runListRows,
  TASK_STATUS_LABEL,
  visibleRuns,
  type Run,
  type RunTask,
} from "@/lib/runs/domain";

const managerA = { id: "manager-a", role: "manager" as const };
const managerB = { id: "manager-b", role: "manager" as const };
const managerC = { id: "manager-c", role: "manager" as const };
const admin = { id: "admin-1", role: "admin" as const };

function task(id: string, over: Partial<RunTask> = {}): RunTask {
  return { id, name: `Task ${id}`, sectionName: "Section", isRequired: false, assigneeId: managerA.id, status: "to_do", ...over };
}

function run(over: Partial<Run> = {}): Run {
  return { id: "r1", caseName: "Apartment 12, move-in", templateName: "Tenant move-in", runManagerId: managerA.id, status: "in_progress", tasks: [], ...over };
}

// Запуск менеджера A, задача «to do» з виконавцем — менеджером B.
const runWithTaskOfB = () => run({ tasks: [task("x", { assigneeId: managerB.id, isRequired: true }), task("y", { isRequired: true })] });

describe("task-completion", () => {
  it('AC-TASK-01: the assignee (manager B) marks their task as done', () => {
    const result = markTaskDone(runWithTaskOfB(), "x", managerB);
    expect(result.ok).toBe(true);
    expect(result.run.tasks.find((t) => t.id === "x")?.status).toBe("done");
  });

  it('AC-TASK-02: the run manager (manager A) marks a task of manager B as done', () => {
    const result = markTaskDone(runWithTaskOfB(), "x", managerA);
    expect(result.ok).toBe(true);
    expect(result.run.tasks.find((t) => t.id === "x")?.status).toBe("done");
  });

  it("AC-TASK-03: manager C cannot mark the task; it stays \"to do\" and C sees the message", () => {
    const result = markTaskDone(runWithTaskOfB(), "x", managerC);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, message: MESSAGES.notAllowedToMark });
    expect(MESSAGES.notAllowedToMark).toBe("Only the task's assignee, the run manager, or an administrator can mark a task as done");
    expect(result.run.tasks.find((t) => t.id === "x")?.status).toBe("to_do");
  });

  it('AC-TASK-04: marking the third required task done completes the run', () => {
    const r = run({
      tasks: [
        task("1", { isRequired: true, status: "done" }),
        task("2", { isRequired: true, status: "done" }),
        task("3", { isRequired: true }),
        task("4"),
        task("5"),
      ],
    });
    // Остання обов'язкова — спершу просимо підтвердження, статус змінюється лише після нього.
    expect(markTaskDone(r, "3", managerA)).toMatchObject({ ok: false, needsConfirmation: true });
    const result = markTaskDone(r, "3", managerA, { confirmed: true });
    expect(result.run.status).toBe("completed");
    expect(result.run.tasks.filter((t) => !t.isRequired).every((t) => t.status === "to_do")).toBe(true);
  });

  it('AC-TASK-05: the run page shows the progress "2 of 5 done"', () => {
    const tasks = [task("1", { status: "done" }), task("2", { status: "done" }), task("3"), task("4"), task("5")];
    expect(progressLabel(tasks)).toBe("2 of 5 done");
  });

  it("AC-TASK-06: manager B sees their own run and the run of A where B is an assignee, not A's second run", () => {
    const firstOfA = run({ id: "a1", tasks: [task("1", { assigneeId: managerB.id }), task("2")] });
    const secondOfA = run({ id: "a2", tasks: [task("3")] });
    const ownOfB = run({ id: "b1", runManagerId: managerB.id, tasks: [task("4", { assigneeId: managerB.id })] });
    const ids = visibleRuns(managerB, [firstOfA, secondOfA, ownOfB]).map((r) => r.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining(["a1", "b1"]));
    expect(ids).not.toContain("a2");
    expect(visibleRuns(admin, [firstOfA, secondOfA, ownOfB])).toHaveLength(3);
  });

  it("AC-TASK-07: an administrator who did not create the run marks a task of manager B as done", () => {
    const result = markTaskDone(runWithTaskOfB(), "x", admin);
    expect(result.ok).toBe(true);
    expect(result.run.tasks.find((t) => t.id === "x")?.status).toBe("done");
  });

  it('AC-TASK-08: the run page shows for each of the 5 tasks whether it is "done" or "to do"', () => {
    const tasks = [task("1", { status: "done" }), task("2", { status: "done" }), task("3"), task("4"), task("5")];
    expect(tasks.map((t) => TASK_STATUS_LABEL[t.status])).toEqual(["done", "done", "to do", "to do", "to do"]);
  });

  it('AC-TASK-09: the list of runs of manager A shows the run with the progress "2 of 5 done"', () => {
    const r = run({ tasks: [task("1", { status: "done" }), task("2", { status: "done" }), task("3"), task("4"), task("5")] });
    const [shown] = visibleRuns(managerA, [r]);
    expect(progressLabel(shown.tasks)).toBe("2 of 5 done");
  });

  it('AC-TASK-10: manager C who is not in the run sees "Run not found" and no tasks', () => {
    const r = run({ tasks: [task("1", { assigneeId: managerB.id })] });
    expect(canSeeRun(managerC, r)).toBe(false);
    expect(RUN_NOT_FOUND).toBe("Run not found");
    expect(visibleRuns(managerC, [r])).toHaveLength(0);
  });

  it("AC-TASK-11: next to each task manager B sees the assignee email, no names or roles", () => {
    const users = [
      { id: managerA.id, email: "member1@example.test" },
      { id: managerB.id, email: "member2@example.test" },
    ];
    const r = run({ tasks: [task("1", { assigneeId: managerB.id }), task("2")] });
    const labels = r.tasks.map((t) => assigneeLabel(users, t.assigneeId));
    expect(labels).toEqual(["member2@example.test", "member1@example.test"]);
    expect(Object.keys(users[0])).toEqual(["id", "email"]);
  });

  it('AC-TASK-12: tasks are shown in two groups — "Before move-in" (2) then "Move-in day" (3)', () => {
    const tasks = [
      task("1", { sectionName: "Before move-in" }),
      task("2", { sectionName: "Before move-in" }),
      task("3", { sectionName: "Move-in day" }),
      task("4", { sectionName: "Move-in day" }),
      task("5", { sectionName: "Move-in day" }),
    ];
    expect(groupBySection(tasks).map((g) => [g.section, g.tasks.length])).toEqual([
      ["Before move-in", 2],
      ["Move-in day", 3],
    ]);
  });

  it('AC-TASK-13: the list shows the completed run as "completed" and "4 of 5 done" next to the run in progress', () => {
    const done = (id: string) => task(id, { status: "done" });
    const rows = runListRows([
      { id: "c", caseName: "Apartment 12", templateName: "Tenant move-in", status: "completed", createdAt: "2026-10-20T10:00:00Z", tasks: [done("1"), done("2"), done("3"), done("4"), task("5")] },
      { id: "p", caseName: "Apartment 14", templateName: "Tenant move-in", status: "in_progress", createdAt: "2026-10-20T09:00:00Z", tasks: [task("6")] },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "c")).toMatchObject({ status: "completed", progress: "4 of 5 done" });
    expect(rows.find((r) => r.id === "p")).toMatchObject({ status: "in progress" });
  });

  it('AC-TASK-14: the later "Repair" run is shown first, each row with case and template name', () => {
    const rows = runListRows([
      { id: "m", caseName: "Apartment 12", templateName: "Tenant move-in", status: "in_progress", createdAt: "2026-10-20T09:00:00Z", tasks: [] },
      { id: "r", caseName: "Apartment 12", templateName: "Repair", status: "in_progress", createdAt: "2026-10-20T11:00:00Z", tasks: [] },
    ]);
    expect(rows.map((r) => r.templateName)).toEqual(["Repair", "Tenant move-in"]);
    expect(rows.every((r) => r.caseName === "Apartment 12")).toBe(true);
  });

  it('AC-TASK-15: 3 tasks are marked "required" and 2 "optional"', () => {
    const flags = [true, true, true, false, false];
    const labels = flags.map(requiredLabel);
    expect(labels.filter((l) => l === "required")).toHaveLength(3);
    expect(labels.filter((l) => l === "optional")).toHaveLength(2);
  });

  it('AC-TASK-16: cancelling at the confirmation keeps the task "to do" and the run "in progress"', () => {
    const r = run({
      tasks: [
        task("1", { isRequired: true, status: "done" }),
        task("2", { isRequired: true, status: "done" }),
        task("3", { isRequired: true, assigneeId: managerB.id }),
      ],
    });
    const result = markTaskDone(r, "3", managerB);
    expect(result).toMatchObject({ ok: false, needsConfirmation: true });
    expect(result.run.tasks.find((t) => t.id === "3")?.status).toBe("to_do");
    expect(result.run.status).toBe("in_progress");
    expect(CONFIRM_NOTICE).toBe("This cannot be undone");
  });

  it('AC-TASK-17: assignee manager B sees the run of manager A with "2 of 5 done" in the list', () => {
    const r = run({ tasks: [task("1", { status: "done" }), task("2", { status: "done" }), task("3", { assigneeId: managerB.id }), task("4"), task("5")] });
    const [shown] = visibleRuns(managerB, [r]);
    expect(progressLabel(shown.tasks)).toBe("2 of 5 done");
  });

  it("AC-TASK-18: manager C is offered the done mark on their own task, not on the task of manager B", () => {
    const r = run({ tasks: [task("b", { assigneeId: managerB.id }), task("c", { assigneeId: managerC.id })] });
    const offered = r.tasks.filter((t) => canMarkDone(managerC, r, t)).map((t) => t.id);
    expect(offered).toEqual(["c"]);
  });

  it("a repeated done mark changes nothing (PM assumption)", () => {
    const once = markTaskDone(runWithTaskOfB(), "x", managerB).run;
    const twice = markTaskDone(once, "x", managerB);
    expect(twice.ok).toBe(true);
    expect(twice.run).toBe(once);
  });
});
