import { describe, expect, it } from "vitest";
import {
  NO_RUNS,
  RUN_STATUS_LABEL,
  RUN_STATUS_TONE,
  runListRows,
  runsListView,
  TASK_STATUS_TONE,
} from "@/lib/runs/domain";
import {
  adminPageAccess,
  formatVersionDate,
  showUnpublishedNotice,
  TEMPLATE_MESSAGES,
  templateMessageFor,
  templateErrorCodeForDb,
  templateVersionLabel,
  versionListRows,
  versionSavedMessage,
} from "@/lib/templates/domain";

// Логіка сторінок зрізу 2: який стан і текст обирає сторінка для кожної ролі. Права даних перевіряють тести бази
// (tests/db/template-versions.test.ts); тут — що бачить користувач, тексти дослівно з AC PM.

describe("design-system", () => {
  it('AC-DSYS-01: the same status has the same word and the same tone in the list and on the run page', () => {
    const rows = runListRows([
      { id: "p", caseName: "A", templateName: "Tenant move-in", status: "in_progress", createdAt: "2026-10-26T09:00:00Z", tasks: [{ status: "done" }, { status: "done" }, { status: "to_do" }, { status: "to_do" }, { status: "to_do" }] },
      { id: "c", caseName: "B", templateName: "Tenant move-in", status: "completed", createdAt: "2026-10-26T08:00:00Z", tasks: Array(5).fill({ status: "done" }) },
    ]);
    // Список і сторінка запуску беруть слово з RUN_STATUS_LABEL і тон з RUN_STATUS_TONE.
    expect(rows.map((r) => r.status)).toEqual([RUN_STATUS_LABEL.in_progress, RUN_STATUS_LABEL.completed]);
    expect(RUN_STATUS_LABEL).toEqual({ in_progress: "in progress", completed: "completed" });
    expect(RUN_STATUS_TONE).toEqual({ in_progress: "progress", completed: "done" }); // синій, зелений
    expect(TASK_STATUS_TONE.done).toBe(RUN_STATUS_TONE.completed); // «done» і «completed» — той самий зелений
    expect(rows.map((r) => r.progress)).toEqual(["2 of 5 done", "5 of 5 done"]);
  });

  it('AC-DSYS-02: manager B opening the editor gets "Not enough rights" and "Back to templates", no editor', () => {
    expect(adminPageAccess("manager")).toEqual({
      kind: "denied",
      message: "Not enough rights",
      backLabel: "Back to templates",
      backHref: "/templates",
    });
  });

  it("AC-DSYS-03: a visitor who is not signed in is sent to the sign-in page", () => {
    expect(adminPageAccess(null)).toEqual({ kind: "login" });
    expect(adminPageAccess(undefined)).toEqual({ kind: "login" });
  });

  it('AC-DSYS-04: no runs — "No runs yet. Launch a template to start one." and "Launch a template", no table', () => {
    expect(runsListView(0)).toEqual({
      kind: "empty",
      message: "No runs yet. Launch a template to start one.",
      actionLabel: "Launch a template",
      actionHref: "/runs/new",
    });
    expect(NO_RUNS).toBe("No runs yet. Launch a template to start one.");
    expect(runsListView(2)).toEqual({ kind: "table" });
  });
});

describe("template-editor (pages)", () => {
  it('AC-EDITOR-01: the administrator sees "Unpublished changes" on a template with kept changes', () => {
    expect(showUnpublishedNotice("admin", true)).toBe(true);
    expect(TEMPLATE_MESSAGES.unpublished).toBe("Unpublished changes");
    expect(showUnpublishedNotice("admin", false)).toBe(false);
  });

  it("AC-EDITOR-02: manager B sees no notice about unpublished changes", () => {
    expect(showUnpublishedNotice("manager", true)).toBe(false);
  });

  it('AC-EDITOR-03: saving shows "Version 2 saved"', () => {
    expect(versionSavedMessage(2)).toBe("Version 2 saved");
  });

  it('AC-EDITOR-04: NO_REQUIRED_TASK from the database shows "A template needs at least one required task"', () => {
    const code = templateErrorCodeForDb('NO_REQUIRED_TASK');
    expect(code).toBe("no_required_task");
    expect(templateMessageFor(code)).toBe("A template needs at least one required task");
  });

  it('AC-EDITOR-05: version 2 first with "12.10.2026 14:05" and the email of C, version 1 second with "05.10.2026 09:30"', () => {
    const rows = versionListRows([
      // Київ у жовтні 2026 до 25.10 — UTC+3.
      { number: 1, createdAt: "2026-10-05T06:30:00Z", authorEmail: "admin-a@example.test" },
      { number: 2, createdAt: "2026-10-12T11:05:00Z", authorEmail: "admin-c@example.test" },
    ]);
    expect(rows).toEqual([
      { number: 2, savedAt: "12.10.2026 14:05", author: "admin-c@example.test" },
      { number: 1, savedAt: "05.10.2026 09:30", author: "admin-a@example.test" },
    ]);
    expect(formatVersionDate("2026-11-02T08:15:00Z")).toBe("02.11.2026 10:15"); // після переходу на UTC+2
  });

  it('AC-EDITOR-06: the run page shows "Template version 1"', () => {
    expect(templateVersionLabel(1)).toBe("Template version 1");
  });

  it('AC-EDITOR-07: manager B on the list of versions gets "Not enough rights" and no versions are loaded', () => {
    const access = adminPageAccess("manager");
    expect(access.kind).toBe("denied");
    expect(access.kind === "denied" ? access.message : "").toBe("Not enough rights");
  });

  it("AC-EDITOR-09: a visitor who is not signed in opening the editor gets the sign-in page", () => {
    expect(adminPageAccess(null).kind).toBe("login");
    expect(adminPageAccess("admin").kind).toBe("allowed");
  });
});
