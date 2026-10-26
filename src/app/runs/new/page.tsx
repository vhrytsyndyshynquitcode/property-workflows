import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assigneeOptions, CASE_NAME_MAX, messageFor } from "@/lib/runs/domain";
import { launchRun } from "../actions";

// Запуск шаблону: шаблон → назва випадку → виконавець кожної задачі (AC-RUN-01, AC-RUN-03..11).
// Виконавець за замовчуванням — менеджер запуску (той, хто запускає); інших показуємо лише за email (AC-RUN-10).
export default async function NewRunPage({ searchParams }: PageProps<"/runs/new">) {
  const { template, error } = await searchParams;
  const templateId = typeof template === "string" ? template : undefined;
  const message = messageFor(error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // Запускаємо лише збережену поточну версію (AC-EDITOR-06): шаблони без версії не показуємо.
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, current_version_id")
    .not("current_version_id", "is", null)
    .order("name");
  const selected = templates?.find((t) => t.id === templateId);

  const { data: tasks } = selected?.current_version_id
    ? await supabase
        .from("version_tasks")
        .select("id, name, is_required, position, template_sections:version_sections(name, position)")
        .eq("version_id", selected.current_version_id)
    : { data: null };
  const sortedTasks = [...(tasks ?? [])].sort(
    (a, b) =>
      (a.template_sections?.position ?? 0) - (b.template_sections?.position ?? 0) || a.position - b.position,
  );

  const { data: users } = selected ? await supabase.rpc("list_assignable_users") : { data: null };
  const others = assigneeOptions(users ?? [], claims.sub);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Launch a template</h1>
      <nav className="flex flex-wrap gap-2 text-sm">
        {(templates ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/runs/new?template=${t.id}`}
            className={`rounded border px-3 py-1 ${t.id === selected?.id ? "border-foreground" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            {t.name}
          </Link>
        ))}
      </nav>
      {selected ? (
        <form action={launchRun} className="flex flex-col gap-4">
          <input type="hidden" name="templateId" value={selected.id} />
          <label className="flex flex-col gap-1 text-sm">
            Case name
            <input
              name="caseName"
              placeholder="Apartment 12, move-in"
              maxLength={CASE_NAME_MAX + 50}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 font-medium">Assignees</legend>
            {sortedTasks.map((task) => (
              <label key={task.id} className="flex items-center justify-between gap-4">
                <span>
                  {task.name}{" "}
                  <span className="text-zinc-500">
                    ({task.template_sections?.name} · {task.is_required ? "required" : "optional"})
                  </span>
                </span>
                <select
                  name={`assignee:${task.id}`}
                  defaultValue=""
                  className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Me (run manager)</option>
                  {others.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
          {message ? (
            <p role="alert" className="text-sm text-red-600">
              {message}
            </p>
          ) : null}
          <button type="submit" className="rounded bg-foreground px-4 py-2 font-medium text-background">
            Launch
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">Pick a template.</p>
      )}
      <Link href="/runs" className="text-sm underline">
        All runs
      </Link>
    </main>
  );
}
