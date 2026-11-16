import { describe, expect, it } from "vitest";
import { docBlockView, isPlainTextFile } from "@/lib/ai/doc-values";
import { loadDocParsing } from "@/lib/runs/doc-records";

// Що показує блок «Parse a document» і кому сторінка його показує (openspec/specs/doc-parsing).
// Права даних перевіряють тести бази (tests/db/doc-records.test.ts); тут — вибір стану й тексти дослівно з AC PM.

type Client = Parameters<typeof loadDocParsing>[0];
function fakeClient(canParse: boolean, rows: unknown[] = []) {
  const calls: string[] = [];
  const query = {
    select: () => query,
    eq: () => query,
    order: async () => ({ data: rows, error: null }),
  };
  const client = {
    rpc: async (fn: string) => (calls.push(`rpc:${fn}`), { data: canParse, error: null }),
    from: (table: string) => (calls.push(`from:${table}`), query),
  } as unknown as Client;
  return { client, calls };
}

describe("doc-parse block", () => {
  it('AC-DOCAI-03: while the AI is working — "Reading the document…", "Propose values" disabled, no value shown', () => {
    const proposal = { kind: "values" as const, documentType: "estimate" as const, phone: null, description: null, category: null, urgency: null, items: [], total: 1, warning: null, notes: [] };
    expect(docBlockView(proposal, true)).toEqual({ reading: "Reading the document…", proposeDisabled: true, message: null, form: "none" });
    expect(docBlockView(proposal, false)).toMatchObject({ reading: null, proposeDisabled: false, form: "proposal" });
  });

  it("AC-DOCAI-05: after «Discard» the block starts again empty — no values, no message", () => {
    // «Discard» не звертається до сервера: блок перемонтовується з початковим станом null.
    expect(docBlockView(null, false)).toEqual({ reading: null, proposeDisabled: false, message: null, form: "none" });
  });

  it('AC-DOCAI-12: "photo.png" is not accepted — only plain text files (.txt)', () => {
    expect(isPlainTextFile("photo.png", "image/png")).toBe(false);
    expect(isPlainTextFile("estimate.pdf", "application/pdf")).toBe(false);
    expect(isPlainTextFile("fake.txt", "image/png")).toBe(false);
    expect(isPlainTextFile("request.txt", "text/plain")).toBe(true);
    expect(isPlainTextFile("REQUEST.TXT", "")).toBe(true);
  });

  it("AC-DOCAI-13: the assistant is not available — the message and an empty form for manual values", () => {
    const view = docBlockView({ kind: "unavailable", message: "The assistant is not available now. Fill in the values yourself." }, false);
    expect(view).toEqual({ reading: null, proposeDisabled: false, message: "The assistant is not available now. Fill in the values yourself.", form: "manual" });
  });

  it("AC-DOCAI-11: an empty text shows its message and no form", () => {
    expect(docBlockView({ kind: "error", message: "Paste the text of a document" }, false)).toMatchObject({ message: "Paste the text of a document", form: "none" });
  });

  it("AC-DOCAI-14: on the page of the run a vendor gets no block — the database is not even asked", async () => {
    const { client, calls } = fakeClient(true);
    expect(await loadDocParsing(client, "run-12", true)).toEqual({ canParse: false, records: [] });
    expect(calls).toEqual([]);
  });

  it("AC-DOCAI-15: manager B, an assignee but not the run manager, gets no block and no records", async () => {
    const { client, calls } = fakeClient(false);
    expect(await loadDocParsing(client, "run-12", false)).toEqual({ canParse: false, records: [] });
    expect(calls).toEqual(["rpc:can_parse_documents"]);
  });

  it("AC-DOCAI-04: the run manager gets the block and the saved records with the email and the Kyiv time", async () => {
    const { client } = fakeClient(true, [
      {
        id: "r1",
        document_type: "maintenance_request",
        values: { documentType: "maintenance_request", phone: "555-0101", description: null, category: "plumbing", urgency: "urgent" },
        confirmed_by_email: "pm-manager@example.test",
        confirmed_at: "2026-11-12T08:15:00Z",
      },
      { id: "broken", document_type: "estimate", values: { nonsense: true }, confirmed_by_email: "x", confirmed_at: "2026-11-12T08:15:00Z" },
    ]);
    const docs = await loadDocParsing(client, "run-12", false);
    expect(docs.canParse).toBe(true);
    expect(docs.records).toEqual([
      {
        id: "r1",
        documentType: "Maintenance request",
        lines: [
          { label: "Phone", value: "555-0101" },
          { label: "Description", value: "not found" },
          { label: "Category", value: "plumbing" },
          { label: "Urgency", value: "urgent" },
        ],
        confirmedBy: "pm-manager@example.test",
        confirmedAt: "12 Nov 2026, 10:15",
      },
    ]);
  });
});
