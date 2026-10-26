"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { swapWithNeighbour, templateErrorCodeForDb } from "@/lib/templates/domain";

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

export async function createTemplate(fd: FormData) {
  const supabase = await requireAdmin();
  const name = str(fd, "name");
  if (!name) redirect("/templates/new?error=failed");
  const { data, error } = await supabase.from("templates").insert({ name }).select("id").single();
  if (error || !data) redirect("/templates/new?error=failed");
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
  await supabase.from("template_sections").insert({ template_id: templateId, name, position: (last?.position ?? 0) + 1 });
  done(templateId);
}

export async function renameSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const name = str(fd, "name");
  if (name) await supabase.from("template_sections").update({ name }).eq("id", str(fd, "sectionId"));
  done(templateId);
}

export async function removeSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  await supabase.from("template_sections").delete().eq("id", str(fd, "sectionId"));
  done(templateId);
}

export async function moveSection(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const { data: sections } = await supabase.from("template_sections").select("id, position").eq("template_id", templateId);
  const pair = swapWithNeighbour(sections ?? [], str(fd, "sectionId"), str(fd, "direction") === "up" ? "up" : "down");
  if (pair) for (const s of pair) await supabase.from("template_sections").update({ position: s.position }).eq("id", s.id);
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
  await supabase.from("template_tasks").insert({
    template_id: templateId,
    section_id: sectionId,
    name,
    is_required: fd.get("required") === "on",
    position: (last?.position ?? 0) + 1,
  });
  done(templateId);
}

export async function updateTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const name = str(fd, "name");
  await supabase
    .from("template_tasks")
    .update({ ...(name ? { name } : {}), is_required: fd.get("required") === "on" })
    .eq("id", str(fd, "taskId"));
  done(templateId);
}

export async function removeTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  await supabase.from("template_tasks").delete().eq("id", str(fd, "taskId"));
  done(templateId);
}

export async function moveTask(fd: FormData) {
  const supabase = await requireAdmin();
  const templateId = str(fd, "templateId");
  const { data: tasks } = await supabase.from("template_tasks").select("id, position").eq("section_id", str(fd, "sectionId"));
  const pair = swapWithNeighbour(tasks ?? [], str(fd, "taskId"), str(fd, "direction") === "up" ? "up" : "down");
  if (pair) for (const t of pair) await supabase.from("template_tasks").update({ position: t.position }).eq("id", t.id);
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
