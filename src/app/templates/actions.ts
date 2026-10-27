"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reorderAfterMove, templateErrorCodeForDb } from "@/lib/templates/domain";

// Дії редактора шаблонів (AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-08). Server Action — публічний POST:
// кожна дія спершу getClaims() і роль admin з profiles, лише потім запис серверним клієнтом користувача (RLS і
// column grants бази — другий рубіж; збереження версії — функція бази з перевіркою ролі).

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  if (profile?.role !== "admin") redirect("/templates?error=not_allowed");
  return supabase;
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const editPath = (id: string) => `/templates/${id}/edit`;

function done(templateId: string, query = ""): never {
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  redirect(`${editPath(templateId)}${query}`);
}

// Відмову бази (RLS, FK, column grants, обмеження) і запис, якого фільтр не знайшов (0 рядків), показуємо як помилку
// дії; відома помилка бази — текстом з AC (порожня назва задачі → «Every section and task needs a name», AC-EDITOR-20).
function doneOrFailed(
  templateId: string,
  result: { error: { message?: string } | null; data?: readonly unknown[] | null },
): never {
  if (result.error) done(templateId, `?error=${templateErrorCodeForDb(result.error.message)}`);
  const missed = result.data !== undefined && (result.data?.length ?? 0) === 0;
  done(templateId, missed ? "?error=failed" : "");
}

export async function createTemplate(fd: FormData) {
  const supabase = await requireAdmin();
  const name = str(fd, "name");
  // AC-EDITOR-19: порожня назва чи самі пробіли; AC-EDITOR-23: унікальний індекс бази (регістр і крайові пробіли).
  if (!name) redirect("/templates/new?error=name_empty");
  const { data, error } = await supabase.from("templates").insert({ name }).select("id").single();
  if (error || !data) redirect(`/templates/new?error=${templateErrorCodeForDb(error?.message)}`);
  done(data.id);
}

export async function addSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const name = str(fd, "name");
  if (!name) done(templateId, "?error=failed");
  const { data: last } = await supabase
    .from("template_sections").select("position").eq("template_id", templateId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase
    .from("template_sections")
    .insert({ template_id: templateId, name, position: (last?.position ?? 0) + 1 });
  doneOrFailed(templateId, { error });
}

export async function renameSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  // Порожня назва лишається в неопублікованих змінах; збереження версії відмовить (AC-EDITOR-20).
  const name = str(fd, "name");
  const result = await supabase
    .from("template_sections").update({ name }).eq("id", str(fd, "sectionId")).eq("template_id", templateId)
    .select("id");
  doneOrFailed(templateId, result);
}

export async function removeSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const result = await supabase
    .from("template_sections").delete().eq("id", str(fd, "sectionId")).eq("template_id", templateId).select("id");
  doneOrFailed(templateId, result);
}

export async function moveSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const { data: sections } = await supabase.from("template_sections").select("id, position").eq("template_id", templateId);
  const changes = reorderAfterMove(sections ?? [], str(fd, "sectionId"), str(fd, "direction") === "up" ? "up" : "down");
  for (const s of changes) {
    const { error } = await supabase
      .from("template_sections").update({ position: s.position }).eq("id", s.id).eq("template_id", templateId);
    if (error) doneOrFailed(templateId, { error });
  }
  done(templateId);
}

export async function addTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const sectionId = str(fd, "sectionId");
  const name = str(fd, "name");
  if (!name) done(templateId, "?error=failed");
  const { data: last } = await supabase
    .from("template_tasks").select("position").eq("section_id", sectionId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("template_tasks").insert({
    template_id: templateId,
    section_id: sectionId,
    name,
    is_required: fd.get("required") === "on",
    position: (last?.position ?? 0) + 1,
  });
  doneOrFailed(templateId, { error });
}

export async function updateTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const name = str(fd, "name");
  const { error, data } = await supabase
    .from("template_tasks")
    .update({ name, is_required: fd.get("required") === "on" }) // порожня назва — див. AC-EDITOR-20
    .eq("id", str(fd, "taskId"))
    .eq("template_id", templateId)
    .select("id");
  doneOrFailed(templateId, { error, data });
}

export async function removeTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const result = await supabase
    .from("template_tasks").delete().eq("id", str(fd, "taskId")).eq("template_id", templateId).select("id");
  doneOrFailed(templateId, result);
}

// AC-EDITOR-28: перенесення задачі в інший розділ того самого шаблону — останньою в новому розділі.
export async function moveTaskToSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const sectionId = str(fd, "toSectionId");
  const { data: target } = await supabase
    .from("template_sections").select("id").eq("id", sectionId).eq("template_id", templateId).maybeSingle();
  if (!target) done(templateId, "?error=failed");
  const { data: last } = await supabase
    .from("template_tasks").select("position").eq("section_id", sectionId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const result = await supabase
    .from("template_tasks")
    .update({ section_id: sectionId, position: (last?.position ?? 0) + 1 })
    .eq("id", str(fd, "taskId"))
    .eq("template_id", templateId)
    .select("id");
  doneOrFailed(templateId, result);
}

export async function moveTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const { data: tasks } = await supabase.from("template_tasks").select("id, position").eq("section_id", str(fd, "sectionId"));
  const changes = reorderAfterMove(tasks ?? [], str(fd, "taskId"), str(fd, "direction") === "up" ? "up" : "down");
  for (const t of changes) {
    const { error } = await supabase
      .from("template_tasks").update({ position: t.position }).eq("id", t.id).eq("template_id", templateId);
    if (error) doneOrFailed(templateId, { error });
  }
  done(templateId);
}

// AC-EDITOR-03, AC-EDITOR-04: збереження версії — функція бази (роль, обов'язкова задача, номер, копія).
export async function saveVersion(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const { data: number, error } = await supabase.rpc("save_template_version", { p_template_id: templateId });
  if (error || typeof number !== "number") done(templateId, `?error=${templateErrorCodeForDb(error?.message)}`);
  done(templateId, `?saved=${number}`);
}
