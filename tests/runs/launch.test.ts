import { describe, expect, it } from "vitest";
import { assigneeOptions, buildRun, groupBySection, MESSAGES, validateCaseName, type TemplateTask } from "@/lib/runs/domain";

// Шаблон «Tenant move-in»: 2 розділи, 5 задач, 3 обов'язкові (як у AC PM і в міграції зрізу).
const tenantMoveIn: TemplateTask[] = [
  { id: "t1", name: "Sign the lease", sectionName: "Before move-in", isRequired: true },
  { id: "t2", name: "Collect the deposit", sectionName: "Before move-in", isRequired: true },
  { id: "t3", name: "Order cleaning", sectionName: "Before move-in", isRequired: false },
  { id: "t4", name: "Hand over the keys", sectionName: "Move-in day", isRequired: true },
  { id: "t5", name: "Record meter readings", sectionName: "Move-in day", isRequired: false },
];
const managerA = "manager-a";
const managerB = "manager-b";
const admin = "admin-1";

describe("run-launch", () => {
  it('AC-RUN-01: launch creates one run "in progress" with all 5 tasks "to do"', () => {
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 12, move-in", launchedBy: managerA });
    expect(run.status).toBe("in_progress");
    expect(run.tasks).toHaveLength(5);
    expect(run.tasks.every((t) => t.status === "to_do")).toBe(true);
    expect(new Set(run.tasks.map((t) => t.sectionName)).size).toBe(2);
    expect(run.tasks.filter((t) => t.isRequired)).toHaveLength(3);
  });

  it("AC-RUN-02: later template changes do not change the run", () => {
    const template = tenantMoveIn.map((t) => ({ ...t }));
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: template, caseName: "Apartment 12, move-in", launchedBy: managerA });
    template.push({ id: "t6", name: "Sixth task", sectionName: "Move-in day", isRequired: false });
    template[0].name = "Renamed first task";
    expect(run.tasks).toHaveLength(5);
    expect(run.tasks.map((t) => t.name)).toEqual(tenantMoveIn.map((t) => t.name));
  });

  it('AC-RUN-03: empty or spaces-only case name is rejected with "Enter a case name"', () => {
    expect(validateCaseName("")).toMatchObject({ ok: false, message: MESSAGES.caseNameEmpty });
    expect(validateCaseName("    ")).toMatchObject({ ok: false, message: "Enter a case name" });
    expect(validateCaseName("\t\n ")).toMatchObject({ ok: false, message: "Enter a case name" });
  });

  it("AC-RUN-04: tasks assigned to manager B go to B, the remaining 3 to manager A", () => {
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 12, move-in", launchedBy: managerA, assignments: { t1: managerB, t4: managerB } });
    expect(run.tasks.filter((t) => t.assigneeId === managerB)).toHaveLength(2);
    expect(run.tasks.filter((t) => t.assigneeId === managerA)).toHaveLength(3);
  });

  it("AC-RUN-05: an administrator who launches a template is the run manager", () => {
    const run = buildRun({ id: "r2", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 14, move-in", launchedBy: admin });
    expect(run.runManagerId).toBe(admin);
    expect(run.tasks).toHaveLength(5);
  });

  it("AC-RUN-06: manager A who launches a template is the run manager", () => {
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 12, move-in", launchedBy: managerA });
    expect(run.runManagerId).toBe(managerA);
  });

  it('AC-RUN-07: a case name of 101 characters is rejected with "Case name must be at most 100 characters"', () => {
    expect(validateCaseName("a".repeat(101))).toMatchObject({ ok: false, message: "Case name must be at most 100 characters" });
    expect(validateCaseName("a".repeat(100))).toEqual({ ok: true, value: "a".repeat(100) });
    // 100 символів з емодзі — це 100 символів, не 200 UTF-16 code units (як length() у Postgres).
    expect(validateCaseName("🏠".repeat(100)).ok).toBe(true);
    expect(validateCaseName("🏠".repeat(101))).toMatchObject({ ok: false, message: "Case name must be at most 100 characters" });
  });

  it("AC-RUN-10: manager A sees only the emails of manager B and the administrator in the assignee picker", () => {
    const users = [
      { id: managerA, email: "member1@example.test" },
      { id: managerB, email: "member2@example.test" },
      { id: admin, email: "admin@example.test" },
    ];
    const options = assigneeOptions(users, managerA);
    expect(options.map((o) => o.label)).toEqual(["member2@example.test", "admin@example.test"]);
    expect(options.every((o) => Object.keys(o).join() === "value,label")).toBe(true);
  });

  it("AC-RUN-11: a 100-character case name preceded by one space is saved without the space", () => {
    const name = "b".repeat(100);
    expect(validateCaseName(` ${name}`)).toEqual({ ok: true, value: name });
  });

  it('AC-RUN-12: after the template sections change the run still shows "Before move-in" (2) and "Move-in day" (3)', () => {
    const template: TemplateTask[] = [
      { id: "a1", name: "Sign the lease", sectionName: "Before move-in", isRequired: true },
      { id: "a2", name: "Collect the deposit", sectionName: "Before move-in", isRequired: true },
      { id: "b1", name: "Hand over the keys", sectionName: "Move-in day", isRequired: true },
      { id: "b2", name: "Record meter readings", sectionName: "Move-in day", isRequired: false },
      { id: "b3", name: "Order cleaning", sectionName: "Move-in day", isRequired: false },
    ];
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: template, caseName: "Apartment 12, move-in", launchedBy: managerA });
    // Розділ перейменовано, задачу перенесено — у шаблоні, не в запуску.
    template.filter((t) => t.sectionName === "Move-in day").forEach((t) => (t.sectionName = "Key handover"));
    template[4].sectionName = "Before move-in";
    const sections = groupBySection(run.tasks);
    expect(sections.map((g) => [g.section, g.tasks.length])).toEqual([
      ["Before move-in", 2],
      ["Move-in day", 3],
    ]);
  });

  it("AC-RUN-08: manager A without assignments is the assignee of all 5 tasks", () => {
    const run = buildRun({ id: "r1", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 12, move-in", launchedBy: managerA });
    expect(run.tasks.every((t) => t.assigneeId === managerA)).toBe(true);
  });

  it("AC-RUN-09: an administrator without assignments is the assignee of all 5 tasks", () => {
    const run = buildRun({ id: "r2", templateName: "Tenant move-in", templateTasks: tenantMoveIn, caseName: "Apartment 14, move-in", launchedBy: admin });
    expect(run.tasks.every((t) => t.assigneeId === admin)).toBe(true);
  });
});
