import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  groupBySection,
  progressLabel,
  RUN_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type RunStatus,
  type TaskStatus,
} from "@/lib/runs/domain";
import { markTaskDone } from "../actions";

// Сторінка запуску: прогрес «N of M done» і статус кожної задачі (AC-TASK-05, AC-TASK-08), позначка «done»
// (AC-TASK-01, AC-TASK-02, AC-TASK-07). Запуск, якого користувач не бачить за RLS, — 404.
export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: run } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, run_tasks(id, name, section_name, is_required, position, assignee_id, status)")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();

  const { data: users } = await supabase.rpc("list_assignable_users");
  const nameOf = new Map((users ?? []).map((u) => [u.id, u.full_name || "—"]));

  const tasks = [...run.run_tasks]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ ...t, sectionName: t.section_name, status: t.status as TaskStatus }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{run.case_name}</h1>
        <p className="text-sm text-zinc-500">
          {run.template_name} · run manager: {nameOf.get(run.run_manager_id) ?? "—"}
        </p>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Status</dt>
        <dd data-testid="run-status">{RUN_STATUS_LABEL[run.status as RunStatus]}</dd>
        <dt className="text-zinc-500">Progress</dt>
        <dd data-testid="run-progress">{progressLabel(tasks)}</dd>
      </dl>
      {groupBySection(tasks).map((group) => (
        <section key={group.section} className="flex flex-col gap-2">
          <h2 className="font-medium">{group.section}</h2>
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {group.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-4 py-2 text-sm" data-testid="task-row">
                <div className="flex flex-col">
                  <span>{task.name}</span>
                  <span className="text-zinc-500">
                    {task.is_required ? "required" : "optional"} · assignee: {nameOf.get(task.assignee_id) ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span data-testid="task-status">{TASK_STATUS_LABEL[task.status]}</span>
                  {task.status === "to_do" ? (
                    <form action={markTaskDone}>
                      <input type="hidden" name="runId" value={run.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                        Mark as done
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Link href="/runs" className="text-sm underline">
        All runs
      </Link>
    </main>
  );
}
