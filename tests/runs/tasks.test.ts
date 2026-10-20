import { describe, expect, it } from "vitest";
import { markTaskDone, MESSAGES, progressLabel, TASK_STATUS_LABEL, visibleRuns, type Run, type RunTask } from "@/lib/runs/domain";

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
    expect(result.ok ? "" : result.message).toBe(MESSAGES.notAllowedToMark);
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
    const result = markTaskDone(r, "3", managerA);
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

  it("a repeated done mark changes nothing (PM assumption)", () => {
    const once = markTaskDone(runWithTaskOfB(), "x", managerB).run;
    const twice = markTaskDone(once, "x", managerB);
    expect(twice.ok).toBe(true);
    expect(twice.run).toBe(once);
  });
});
