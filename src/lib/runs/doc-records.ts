import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENT_TYPE_LABEL, SavedValuesSchema, formatConfirmedAt, recordLines } from "@/lib/ai/doc-values";
import type { Database } from "@/lib/supabase/database.types";

// Зріз 4: блок «Parse a document» і збережені записи на сторінці запуску (openspec/specs/doc-parsing).
// Права вирішує база (private.can_parse_documents): менеджер запуску й адміністратор; вендор і виконавець — ні
// (AC-DOCAI-14, AC-DOCAI-15). Вендору функцію не викликаємо зовсім: його сторінка читає лише vendor_* (ADR 0008).

type Client = SupabaseClient<Database>;

export type DocRecordView = {
  id: string;
  documentType: string;
  lines: { label: string; value: string }[];
  confirmedBy: string;
  confirmedAt: string;
};

/** Чи показувати блок і які записи (новіший першим, AC-DOCAI-04). */
export async function loadDocParsing(supabase: Client, runId: string, isVendor: boolean) {
  if (isVendor) return { canParse: false, records: [] as DocRecordView[] };
  const { data: canParse } = await supabase.rpc("can_parse_documents", { p_run_id: runId });
  if (canParse !== true) return { canParse: false, records: [] as DocRecordView[] };
  const { data } = await supabase
    .from("doc_records")
    .select("id, document_type, values, confirmed_by_email, confirmed_at")
    .eq("run_id", runId)
    .order("confirmed_at", { ascending: false });
  return { canParse: true, records: (data ?? []).flatMap(toView) };
}

function toView(row: { id: string; document_type: string; values: unknown; confirmed_by_email: string; confirmed_at: string }): DocRecordView[] {
  const parsed = SavedValuesSchema.safeParse(row.values);
  if (!parsed.success) return [];
  return [
    {
      id: row.id,
      documentType: DOCUMENT_TYPE_LABEL[parsed.data.documentType],
      lines: recordLines(parsed.data),
      confirmedBy: row.confirmed_by_email,
      confirmedAt: formatConfirmedAt(row.confirmed_at),
    },
  ];
}
