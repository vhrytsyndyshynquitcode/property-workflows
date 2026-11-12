import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Читання даних вендора (ADR 0008): таблиці runs і run_tasks вендору закриті, дані — лише з функцій vendor_runs() і
// vendor_tasks(), які самі віддають тільки дозволені колонки (без шаблону, версії, менеджера запуску й done_by).
// Помилку RPC кидаємо: інакше збій завантаження виглядав би як «No tasks assigned to you yet.» чи «Run not found».

type Client = SupabaseClient<Database>;

/** Рядок списку запусків вендора — у формі запиту інших ролей; шаблону й часу запуску вендор не отримує. */
type VendorListRun = {
  id: string;
  case_name: string;
  template_name: string;
  status: string;
  created_at: string;
  run_tasks: { status: string; assignee_id: string }[];
};

/** Запуски вендора з його задачами; порядок (новіші вище) задає vendor_runs(), стабільне сортування його зберігає. */
export async function loadVendorRuns(supabase: Client, userId: string): Promise<VendorListRun[]> {
  const [runs, tasks] = await Promise.all([supabase.rpc("vendor_runs"), supabase.rpc("vendor_tasks", {})]);
  if (runs.error) throw runs.error;
  if (tasks.error) throw tasks.error;
  return runs.data.map((r) => ({
    id: r.id,
    case_name: r.case_name,
    template_name: "",
    status: r.status,
    created_at: "",
    run_tasks: tasks.data.filter((t) => t.run_id === r.id).map((t) => ({ status: t.status, assignee_id: userId })),
  }));
}

/** Список запусків для сторінки /runs: вендору — з функцій, іншим ролям — з таблиці за RLS (private.can_see_run). */
export async function loadRunsList(supabase: Client, userId: string, isVendor: boolean): Promise<VendorListRun[]> {
  if (isVendor) return loadVendorRuns(supabase, userId);
  const { data } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, created_at, run_tasks(status, assignee_id)");
  return data ?? [];
}

/** Запуск для сторінки /runs/[id]: вендору — лише його задачі з функцій, іншим ролям — увесь запуск за RLS. */
export async function loadRunPage(supabase: Client, runId: string, userId: string, isVendor: boolean) {
  if (isVendor) return loadVendorRun(supabase, runId, userId);
  const { data } = await supabase
    .from("runs")
    .select(
      "id, case_name, template_name, status, run_manager_id, template_version:template_versions(number), run_tasks(id, name, section_name, is_required, position, assignee_id, status)",
    )
    .eq("id", runId)
    .maybeSingle();
  return data;
}

/** Запуск вендора з лише його задачами або null, якщо в запуску в нього немає задач («Run not found»). */
export async function loadVendorRun(supabase: Client, runId: string, userId: string) {
  const [runs, tasks] = await Promise.all([
    supabase.rpc("vendor_runs"),
    supabase.rpc("vendor_tasks", { p_run_id: runId }),
  ]);
  if (runs.error) throw runs.error;
  if (tasks.error) throw tasks.error;
  const found = runs.data.find((r) => r.id === runId);
  if (!found) return null;
  return {
    id: found.id,
    case_name: found.case_name,
    template_name: "",
    status: found.status,
    run_manager_id: "",
    template_version: null,
    run_tasks: tasks.data.map((t) => ({ ...t, assignee_id: userId })),
  };
}
