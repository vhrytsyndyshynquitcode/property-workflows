import { describe, expect, it } from "vitest";
import {
  canSaveVersion,
  launchOption,
  removalTarget,
  TEMPLATE_MESSAGES,
  templateErrorCodeForDb,
  templateMessageFor,
  templatesEmptyState,
} from "@/lib/templates/domain";

// Логіка сторінок редактора для уточнень PM 27.10: що показує сторінка і з яким текстом. Права й дані перевіряють
// тести бази (tests/db/template-editor-oct27.test.ts); тут — тексти дослівно з AC PM і вибір стану.
const SECTION = "00000000-0000-4000-8000-000000000102";

describe("template-editor oct27 (pages)", () => {
  it('AC-EDITOR-10: a template never saved as a version is unavailable in the launch form with "Save the template to launch it"', () => {
    expect(launchOption({ hasVersion: false })).toEqual({ available: false, note: "Save the template to launch it" });
    expect(launchOption({ hasVersion: true })).toEqual({ available: true });
  });

  it("AC-EDITOR-12: Save is not offered while the template has no unpublished changes", () => {
    expect(canSaveVersion(false)).toBe(false);
    expect(canSaveVersion(true)).toBe(true);
    // Прямий виклик без змін: база відмовляє NO_CHANGES, сторінка не показує помилки.
    expect(templateErrorCodeForDb("NO_CHANGES")).toBe("no_changes");
    expect(templateMessageFor("no_changes")).toBeUndefined();
  });

  it('AC-EDITOR-13: removing a section first asks for confirmation with "This cannot be undone"; cancel removes nothing', () => {
    expect(removalTarget(`section:${SECTION}`)).toEqual({ kind: "section", id: SECTION });
    expect(TEMPLATE_MESSAGES.cannotBeUndone).toBe("This cannot be undone");
    // Скасування — посилання без параметра remove: підтвердження зникає, нічого не надіслано.
    expect(removalTarget(undefined)).toBeNull();
    expect(removalTarget("section:not-a-uuid")).toBeNull();
    expect(removalTarget(`task:${SECTION}`)).toEqual({ kind: "task", id: SECTION });
  });

  it('AC-EDITOR-15: a section with no tasks shows "Every section needs at least one task"', () => {
    const code = templateErrorCodeForDb("EMPTY_SECTION");
    expect(templateMessageFor(code)).toBe("Every section needs at least one task");
  });

  it('AC-EDITOR-16: manager B on a template never saved as a version sees "Template not found"', () => {
    expect(TEMPLATE_MESSAGES.templateNotFound).toBe("Template not found");
  });

  it('AC-EDITOR-17: manager B with no saved templates sees "No templates yet. An administrator creates them." and no table', () => {
    expect(templatesEmptyState("manager")).toEqual({ message: "No templates yet. An administrator creates them." });
    expect(templatesEmptyState("admin")).toEqual({
      message: "No templates yet. Create a template to start.",
      actionLabel: "Create a template",
      actionHref: "/templates/new",
    });
  });

  it('AC-EDITOR-18: a template never saved as a version has the list of versions "No versions yet. Save the template to create version 1."', () => {
    expect(TEMPLATE_MESSAGES.noVersions).toBe("No versions yet. Save the template to create version 1.");
  });

  it('AC-EDITOR-19: an empty template name shows "Enter a template name"', () => {
    expect(templateMessageFor("name_empty")).toBe("Enter a template name");
  });

  it('AC-EDITOR-20: an empty section or task name shows "Every section and task needs a name"', () => {
    for (const dbMessage of ["NAME_REQUIRED", 'new row for relation "template_tasks" violates check constraint "template_tasks_name_check"']) {
      expect(templateMessageFor(templateErrorCodeForDb(dbMessage))).toBe("Every section and task needs a name");
    }
  });

  it('AC-EDITOR-23: an existing name in another case or with spaces shows "A template with this name already exists"', () => {
    const code = templateErrorCodeForDb('duplicate key value violates unique constraint "templates_name_unique"');
    expect(code).toBe("name_exists");
    expect(templateMessageFor(code)).toBe("A template with this name already exists");
  });
});
