import { describe, expect, it } from "vitest";
import {
  MESSAGES,
  NOTES,
  formatConfirmedAt,
  normalizePhone,
  recordLines,
  savedValuesFrom,
  toProposal,
  totalWarning,
} from "@/lib/ai/doc-values";
import type { Draft } from "@/lib/ai/schema";

// Правила зрізу 4, які перевіряє код, а не модель (openspec/specs/doc-parsing).
const base: Draft = {
  status: "ok",
  documentType: "maintenance_request",
  phone: null,
  description: null,
  category: null,
  urgency: null,
  items: null,
  total: null,
  twoProblems: false,
  ignoredInstructions: false,
  possibleGasLeak: false,
};
const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
  return fd;
};

describe("doc-values", () => {
  it("AC-DOCAI-01: a request shows the phone as 555-0101 whatever way the model wrote the digits", () => {
    expect(normalizePhone("5550101")).toBe("555-0101");
    expect(normalizePhone("555 01 01")).toBe("555-0101");
    expect(normalizePhone("555-0101")).toBe("555-0101");
    expect(normalizePhone("  ")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    const p = toProposal({ ...base, phone: "555 0101", description: " Kitchen tap drips ", category: "plumbing", urgency: "not urgent", items: [{ name: "x", quantity: 1, unitPrice: 1 }] });
    expect(p).toEqual({
      kind: "values",
      documentType: "maintenance_request",
      phone: "555-0101",
      description: "Kitchen tap drips",
      category: "plumbing",
      urgency: "not urgent",
      items: [],
      total: null,
      warning: null,
      notes: [],
    });
  });

  it("AC-DOCAI-02: an estimate whose items add up to the total has no warning", () => {
    const items = [
      { name: "Replace kitchen tap", quantity: 1, unitPrice: 85 },
      { name: "Labour", quantity: 2, unitPrice: 60 },
      { name: "Disposal fee", quantity: 1, unitPrice: 15 },
    ];
    expect(totalWarning(items, 220)).toBeNull();
    expect(toProposal({ ...base, documentType: "estimate", items, total: 220, phone: "555-0101" })).toMatchObject({ kind: "values", documentType: "estimate", items, total: 220, warning: null, phone: null });
  });

  it('AC-DOCAI-08: items that add up to another amount give the warning "items add up to 220.00, the stated total is 200.00"', () => {
    const items = [
      { name: "Inspection", quantity: 1, unitPrice: 90 },
      { name: "Replace valve", quantity: 1, unitPrice: 70 },
      { name: "Labour", quantity: 1, unitPrice: 60 },
    ];
    expect(totalWarning(items, 200)).toBe("items add up to 220.00, the stated total is 200.00");
    // Сума — як написано: код її не виправляє.
    expect(toProposal({ ...base, documentType: "estimate", items, total: 200 })).toMatchObject({ total: 200, warning: "items add up to 220.00, the stated total is 200.00" });
    expect(totalWarning(items, null)).toBeNull();
    expect(totalWarning([], 10)).toBeNull();
    expect(totalWarning([{ name: "a", quantity: 3, unitPrice: 0.1 }], 0.3)).toBeNull();
  });

  it("AC-DOCAI-09: a document that is neither a request nor an estimate is refused with the exact message", () => {
    expect(toProposal({ ...base, status: "not_a_document" })).toEqual({ kind: "refused", message: "This document is not a maintenance request or an estimate." });
    expect(toProposal({ ...base, documentType: null })).toEqual({ kind: "refused", message: MESSAGES.notADocument });
  });

  it("AC-DOCAI-07: two problems give the note «the email has two problems»; AC-DOCAI-10 note for ignored instructions", () => {
    expect(toProposal({ ...base, twoProblems: true })).toMatchObject({ notes: ["the email has two problems"] });
    expect(toProposal({ ...base, ignoredInstructions: true, possibleGasLeak: true })).toMatchObject({
      notes: [NOTES.possibleGasLeak, "the text contains instructions to the AI that were ignored"],
    });
  });

  it("AC-DOCAI-04: the values a person saves are checked again — the corrected urgency is kept", () => {
    expect(
      savedValuesFrom(form({ documentType: "maintenance_request", phone: "555 0101", description: "Tap drips", category: "plumbing", urgency: "urgent" })),
    ).toEqual({ documentType: "maintenance_request", phone: "555-0101", description: "Tap drips", category: "plumbing", urgency: "urgent" });
    expect(
      savedValuesFrom(form({ documentType: "estimate", itemName: ["Labour", ""], itemQuantity: ["2", "1"], itemUnitPrice: ["60", "0"], total: "120" })),
    ).toEqual({ documentType: "estimate", items: [{ name: "Labour", quantity: 2, unitPrice: 60 }], total: 120 });
    // Без типу документа, з чужою категорією чи з нечисловою кількістю — нічого не зберігаємо.
    expect(savedValuesFrom(form({ documentType: "" }))).toBeNull();
    expect(savedValuesFrom(form({ documentType: "estimate", itemName: "x", itemQuantity: "abc", itemUnitPrice: "1", total: "" }))).toBeNull();
    expect(
      savedValuesFrom(form({ documentType: "maintenance_request", phone: "", description: "", category: "dragons", urgency: "" })),
    ).toEqual({ documentType: "maintenance_request", phone: null, description: null, category: null, urgency: null });
  });

  it('AC-DOCAI-04: the saved record shows the values and the Kyiv date and time like "12 Nov 2026, 10:15"', () => {
    expect(formatConfirmedAt("2026-11-12T08:15:00Z")).toBe("12 Nov 2026, 10:15");
    expect(recordLines({ documentType: "maintenance_request", phone: "555-0101", description: null, category: "plumbing", urgency: "urgent" })).toEqual([
      { label: "Phone", value: "555-0101" },
      { label: "Description", value: "not found" },
      { label: "Category", value: "plumbing" },
      { label: "Urgency", value: "urgent" },
    ]);
    expect(recordLines({ documentType: "estimate", items: [{ name: "Labour", quantity: 2, unitPrice: 60 }], total: null })).toEqual([
      { label: "Labour", value: "2 x 60.00" },
      { label: "Total", value: "not found" },
    ]);
  });
});
