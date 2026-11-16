"use server";

// Server Actions зрізу 4 «Parse a document» (openspec/specs/doc-parsing). Два кроки, між ними — людина:
//   1. requestDocValues — хто кличе (getClaims) і чи це менеджер запуску чи адміністратор — ДО виклику моделі;
//      спитати модель і ПОВЕРНУТИ пропозицію в блок. Нічого не пише.
//   2. saveDocValues    — людина переглянула й, можливо, виправила значення: перевірити ще раз на сервері й лише тоді
//      записати (save_doc_record перевіряє права втретє, у базі).
// Основа — koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/app/ai-draft/actions.ts.
import { revalidatePath } from "next/cache";
import { MAX_TEXT_LENGTH, MESSAGES, savedValuesFrom, toProposal, type Proposal } from "@/lib/ai/doc-values";
import { proposeDraft } from "@/lib/ai/draft";
import { productModel } from "@/lib/ai/openrouter";
import { createClient } from "@/lib/supabase/server";

export type RequestState =
  | null
  | { kind: "denied"; message: string } // AC-DOCAI-16
  | { kind: "error"; message: string } // AC-DOCAI-11
  | { kind: "unavailable"; message: string } // AC-DOCAI-13: ручне заповнення
  | Proposal; // AC-DOCAI-01, 02, 06…10

export type SaveState = null | { kind: "saved" } | { kind: "error"; message: string };

/** Вхід і права на розбір документів цього запуску (база вирішує: private.can_parse_documents). */
async function mayParse(runId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || !runId) return { supabase, allowed: false };
  const { data: allowed } = await supabase.rpc("can_parse_documents", { p_run_id: runId });
  return { supabase, allowed: allowed === true };
}

export async function requestDocValues(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const runId = String(formData.get("runId") ?? "");
  const { allowed } = await mayParse(runId);
  // Без прав модель не викликаємо: інакше будь-хто витратив би денний ліміт (AC-DOCAI-16).
  if (!allowed) return { kind: "denied", message: MESSAGES.notEnoughRights };

  const text = String(formData.get("text") ?? "");
  if (!text.trim()) return { kind: "error", message: MESSAGES.emptyText };

  const model = productModel();
  if (!model) return { kind: "unavailable", message: MESSAGES.unavailable };
  const result = await proposeDraft({ text: text.slice(0, MAX_TEXT_LENGTH) }, model);
  // Ліміт, таймаут, відповідь не за схемою, помилка постачальника — помічник недоступний, форма працює вручну.
  return result.ok ? toProposal(result.draft) : { kind: "unavailable", message: MESSAGES.unavailable };
}

export async function saveDocValues(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const runId = String(formData.get("runId") ?? "");
  const { supabase, allowed } = await mayParse(runId);
  if (!allowed) return { kind: "error", message: MESSAGES.notEnoughRights };

  const values = savedValuesFrom(formData);
  if (!values) return { kind: "error", message: "Choose the document type and check the values" };

  const { error } = await supabase.rpc("save_doc_record", {
    p_run_id: runId,
    p_document_type: values.documentType,
    p_values: values,
  });
  if (error) return { kind: "error", message: /NOT_ALLOWED/.test(error.message) ? MESSAGES.notEnoughRights : "The values were not saved. Try again." };
  revalidatePath(`/runs/${runId}`);
  return { kind: "saved" };
}
