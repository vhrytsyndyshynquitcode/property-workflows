import Link from "next/link";
import { redirect } from "next/navigation";
import { navFor } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";
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
  RUN_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  tasksVisibleTo,
  yourTasksLabel,
  type RunStatus,
  type TaskStatus,
} from "@/lib/runs/domain";
import { templateVersionLabel, type Role } from "@/lib/templates/domain";
import { markTaskDone } from "../actions";

// Сторінка запуску: прогрес і статус кожної задачі (AC-TASK-05, AC-TASK-08, AC-DSYS-01), задачі за розділами на момент
// запуску (AC-TASK-12, AC-RUN-12), позначка required/optional (AC-TASK-15), email виконавця (AC-TASK-11), «Mark as done»
// лише на задачах, які користувач може позначити (AC-TASK-18), підтвердження останньої обов'язкової (AC-TASK-04,
// AC-TASK-16). Запуск, якого користувач не бачить за RLS, — «Run not found» (AC-TASK-10).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const { confirm } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  const actor = { id: claims.sub, role: (profile?.role ?? "manager") as Role };
  // AC-VENDOR-04: вендор бачить лише свої задачі — назву, розділ, «required»/«optional», статус і «Your tasks: N of K
  // done»; без шаблону, версії, менеджера запуску, email, статусу й прогресу всього запуску. Таблиці runs і run_tasks
  // для вендора закриті (ADR 0008): дані — лише з функцій vendor_runs() і vendor_tasks(), які віддають тільки ці колонки.
  const isVendor = actor.role === "vendor";

  const run = isVendor
    ? await (async () => {
        const [{ data: own }, { data: tasks }] = await Promise.all([
          supabase.rpc("vendor_runs"),
          supabase.rpc("vendor_tasks", { p_run_id: id }),
        ]);
        const found = (own ?? []).find((r) => r.id === id);
        if (!found) return null;
        return {
          id: found.id,
          case_name: found.case_name,
          template_name: "",
          status: found.status,
          run_manager_id: "",
          template_version: null,
          run_tasks: (tasks ?? []).map((t) => ({ ...t, assignee_id: actor.id })),
        };
      })()
    : (
        await supabase
          .from("runs")
          .select("id, case_name, template_name, status, run_manager_id, template_version:template_versions(number), run_tasks(id, name, section_name, is_required, position, assignee_id, status)")
          .eq("id", id)
          .maybeSingle()
      ).data;

  if (!run) {
    return (
      <AppShell nav={navFor(actor.role)} actions={<SignOutButton />}>
        <Alert>
          <AlertTitle>{RUN_NOT_FOUND}</AlertTitle>
        </Alert>
        <Link href="/runs" className="text-sm text-primary underline-offset-4 hover:underline">
          All runs
        </Link>
      </AppShell>
    );
  }

  const { data: users } = isVendor ? { data: [] } : await supabase.rpc("list_assignable_users");

  const tasks = tasksVisibleTo(
    actor,
    [...run.run_tasks]
      .sort((a, b) => a.position - b.position)
      .map((t) => ({ ...t, assigneeId: t.assignee_id, sectionName: t.section_name, status: t.status as TaskStatus })),
  );
  const confirmTask = typeof confirm === "string" ? tasks.find((t) => t.id === confirm && t.status === "to_do") : undefined;
  const runStatus = run.status as RunStatus;

  return (
    <AppShell nav={navFor(actor.role)} actions={<SignOutButton />}>
      <PageHeader
        title={run.case_name}
        description={isVendor ? undefined : `${run.template_name}${run.template_version ? ` · ${templateVersionLabel(run.template_version.number)}` : ""} · run manager: ${assigneeLabel(users ?? [], run.run_manager_id)}`}
      />
      {isVendor ? (
        <p data-testid="your-tasks" className="text-sm tabular-nums">
          {yourTasksLabel(tasks, actor.id)}
        </p>
      ) : (
      <dl className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd data-testid="run-status">
          <StatusBadge tone={RUN_STATUS_TONE[runStatus]}>{RUN_STATUS_LABEL[runStatus]}</StatusBadge>
        </dd>
        <dt className="text-muted-foreground">Progress</dt>
        <dd data-testid="run-progress" className="tabular-nums">
          {progressLabel(tasks)}
        </dd>
      </dl>
      )}
      {confirmTask ? (
        <Alert role="alertdialog" aria-labelledby="confirm-title">
          <AlertTitle id="confirm-title">{confirmTask.name}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{CONFIRM_NOTICE}</p>
            <div className="flex gap-3">
              <form action={markTaskDone}>
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="taskId" value={confirmTask.id} />
                <input type="hidden" name="confirmed" value="1" />
                <Button type="submit" variant="destructive">
                  Confirm
                </Button>
              </form>
              <Link href={`/runs/${run.id}`} className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {groupBySection(tasks).map((group) => (
        <Card key={group.section}>
          <CardContent className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{group.section}</h2>
            <ul className="flex flex-col divide-y divide-border">
              {group.tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm" data-testid="task-row">
                  <div className="flex flex-col">
                    <span>{task.name}</span>
                    {isVendor ? (
                      <span className="text-muted-foreground">{task.sectionName}</span>
                    ) : (
                      <span className="text-muted-foreground">{assigneeLabel(users ?? [], task.assignee_id)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{requiredLabel(task.is_required)}</span>
                    <span data-testid="task-status">
                      <StatusBadge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</StatusBadge>
                    </span>
                    {task.status === "to_do" &&
                    canMarkDone(actor, { runManagerId: run.run_manager_id }, { assigneeId: task.assignee_id }) ? (
                      <form action={markTaskDone}>
                        <input type="hidden" name="runId" value={run.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Mark as done
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <Link href="/runs" className="text-sm text-primary underline-offset-4 hover:underline">
        All runs
      </Link>
    </AppShell>
  );
}
