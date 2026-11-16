import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions зрізу 4 з підробленими Supabase і моделлю (openspec/specs/doc-parsing).
// Головне: без прав модель не викликається й нічого не пишеться; модель сама нічого не пише в базу.
// Ключа OPENROUTER_API_KEY у тестах немає: productModel() → null. Відповіді моделі перевіряє офлайн-реплей golden cases
// (tests/golden.test.ts); тут — шлях дій навколо моделі.

const db = vi.hoisted(() => ({
  signedIn: true,
  allowed: true,
  saveError: null as null | { message: string },
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: db.signedIn ? { claims: { sub: "manager-a" } } : null }) },
    rpc: db.rpc,
  }),
}));

const { requestDocValues, saveDocValues } = await import("@/app/runs/[id]/doc-actions");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};

beforeEach(() => {
  db.signedIn = true;
  db.allowed = true;
  db.saveError = null;
  db.rpc.mockReset();
  db.rpc.mockImplementation(async (fn: string) => {
    if (fn === "can_parse_documents") return { data: db.allowed, error: null };
    if (fn === "save_doc_record") return { data: db.saveError ? null : "rec-1", error: db.saveError };
    return { data: null, error: null };
  });
  delete process.env.OPENROUTER_API_KEY;
});

const calls = (fn: string) => db.rpc.mock.calls.filter(([name]) => name === fn);

describe("doc-actions", () => {
  it('AC-DOCAI-11: an empty text or only spaces — "Paste the text of a document", the model is not called', async () => {
    expect(await requestDocValues(null, form({ runId: "run-1", text: "   " }))).toEqual({ kind: "error", message: "Paste the text of a document" });
    expect(await requestDocValues(null, form({ runId: "run-1", text: "" }))).toEqual({ kind: "error", message: "Paste the text of a document" });
  });

  it("AC-DOCAI-13: no model key — the assistant is not available, the values are filled in by hand", async () => {
    process.env.OPENROUTER_API_KEY = "   "; // лише пробіли = «ключа немає»
    expect(await requestDocValues(null, form({ runId: "run-1", text: "Tap drips" }))).toEqual({
      kind: "unavailable",
      message: "The assistant is not available now. Fill in the values yourself.",
    });
  });

  it('AC-DOCAI-16: a vendor or a manager who is not the run manager asks directly — "Not enough rights" before the model', async () => {
    db.allowed = false;
    process.env.OPENROUTER_API_KEY = "sk-or-test-not-used";
    expect(await requestDocValues(null, form({ runId: "run-1", text: "Tap drips" }))).toEqual({ kind: "denied", message: "Not enough rights" });
    expect(calls("can_parse_documents")).toHaveLength(1);
    db.signedIn = false;
    expect(await requestDocValues(null, form({ runId: "run-1", text: "Tap drips" }))).toEqual({ kind: "denied", message: "Not enough rights" });
  });

  it('AC-DOCAI-16: saving directly without rights — "Not enough rights", no record is saved', async () => {
    db.allowed = false;
    const fields = { runId: "run-1", documentType: "maintenance_request", phone: "555-0101", description: "x", category: "plumbing", urgency: "urgent" };
    expect(await saveDocValues(null, form(fields))).toEqual({ kind: "error", message: "Not enough rights" });
    expect(calls("save_doc_record")).toHaveLength(0);
    // Друга лінія — база: якщо права змінились між перевірками, NOT_ALLOWED стає тим самим повідомленням.
    db.allowed = true;
    db.saveError = { message: "NOT_ALLOWED" };
    expect(await saveDocValues(null, form(fields))).toEqual({ kind: "error", message: "Not enough rights" });
  });

  it("AC-DOCAI-04: the person's corrected values are saved after «Save values»", async () => {
    const state = await saveDocValues(
      null,
      form({ runId: "run-1", documentType: "maintenance_request", phone: "555-0101", description: "Tap drips", category: "plumbing", urgency: "urgent" }),
    );
    expect(state).toEqual({ kind: "saved" });
    expect(calls("save_doc_record")[0][1]).toEqual({
      p_run_id: "run-1",
      p_document_type: "maintenance_request",
      p_values: { documentType: "maintenance_request", phone: "555-0101", description: "Tap drips", category: "plumbing", urgency: "urgent" },
    });
    // Без типу документа запису немає.
    expect(await saveDocValues(null, form({ runId: "run-1", documentType: "" }))).toMatchObject({ kind: "error" });
    expect(calls("save_doc_record")).toHaveLength(1);
  });
});
