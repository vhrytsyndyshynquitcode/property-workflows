import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  assigneeLabel,
  canMarkDone,
  CONFIRM_NOTICE,
  groupBySection,
  progressLabel,
  requiredLabel,
  RUN_NOT_FOUND,
  RUN_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type Role,
  type RunStatus,
  type TaskStatus,
} from "@/lib/runs/domain";
import { markTaskDone } from "../actions";

// Сторінка запуску: прогрес і статус кожної задачі (AC-TASK-05, AC-TASK-08), задачі за розділами на момент запуску
// (AC-TASK-12, AC-RUN-12), позначка required/optional (AC-TASK-15), email виконавця (AC-TASK-11), «Mark as done» лише
// на задачах, які користувач може позначити (AC-TASK-18), підтвердження останньої обов'язкової (AC-TASK-04, AC-TASK-16).
// Запуск, якого користувач не бачить за RLS, — «Run not found» (AC-TASK-10).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const { confirm } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: run } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, run_tasks(id, name, section_name, is_required, position, assignee_id, status)")
    .eq("id", id)
    .maybeSingle();

  if (!run) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
        <p role="alert" className="text-lg">
          {RUN_NOT_FOUND}
        </p>
        <Link href="/runs" className="text-sm underline">
          All runs
        </Link>
      </main>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  const actor = { id: claims.sub, role: (profile?.role ?? "manager") as Role };
  const { data: users } = await supabase.rpc("list_assignable_users");

  const tasks = [...run.run_tasks]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ ...t, sectionName: t.section_name, status: t.status as TaskStatus }));
  const confirmTask = typeof confirm === "string" ? tasks.find((t) => t.id === confirm && t.status === "to_do") : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{run.case_name}</h1>
        <p className="text-sm text-zinc-500">
          {run.template_name} · run manager: {assigneeLabel(users ?? [], run.run_manager_id)}
        </p>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Status</dt>
        <dd data-testid="run-status">{RUN_STATUS_LABEL[run.status as RunStatus]}</dd>
        <dt className="text-zinc-500">Progress</dt>
        <dd data-testid="run-progress">{progressLabel(tasks)}</dd>
      </dl>
      {confirmTask ? (
        <section role="alertdialog" className="flex flex-col gap-3 rounded border border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <p className="font-medium">{confirmTask.name}</p>
          <p>{CONFIRM_NOTICE}</p>
          <div className="flex gap-3">
            <form action={markTaskDone}>
              <input type="hidden" name="runId" value={run.id} />
              <input type="hidden" name="taskId" value={confirmTask.id} />
              <input type="hidden" name="confirmed" value="1" />
              <button type="submit" className="rounded bg-foreground px-3 py-1 font-medium text-background">
                Confirm
              </button>
            </form>
            <Link href={`/runs/${run.id}`} className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
              Cancel
            </Link>
          </div>
        </section>
      ) : null}
      {groupBySection(tasks).map((group) => (
        <section key={group.section} className="flex flex-col gap-2">
          <h2 className="font-medium">{group.section}</h2>
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {group.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-4 py-2 text-sm" data-testid="task-row">
                <div className="flex flex-col">
                  <span>{task.name}</span>
                  <span className="text-zinc-500">{assigneeLabel(users ?? [], task.assignee_id)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{requiredLabel(task.is_required)}</span>
                  <span data-testid="task-status">{TASK_STATUS_LABEL[task.status]}</span>
                  {task.status === "to_do" && canMarkDone(actor, { runManagerId: run.run_manager_id }, { assigneeId: task.assignee_id }) ? (
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
