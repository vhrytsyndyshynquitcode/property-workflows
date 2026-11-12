import Link from "next/link";
import { redirect } from "next/navigation";
import { navFor } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AppShell, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  messageFor,
  RUN_STATUS_TONE,
  runListRows,
  runsListViewFor,
  yourTasksLabel,
  type RunStatus,
  type TaskStatus,
} from "@/lib/runs/domain";
import type { Role } from "@/lib/templates/domain";
import { loadRunsList } from "@/lib/runs/vendor-reads";
import { createClient } from "@/lib/supabase/server";

// Список запусків (AC-TASK-06, AC-TASK-09, AC-TASK-13, AC-TASK-14, AC-TASK-17, AC-DSYS-01, AC-DSYS-04). Які запуски
// видно, вирішує RLS (private.can_see_run): менеджер — свої й ті, де він виконавець; адміністратор — усі.
// Вендор (AC-VENDOR-03, AC-VENDOR-10): лише запуски, де він виконавець, — випадок, статус і «Your tasks: N of K done»
// з функцій vendor_runs() і vendor_tasks(), які самі віддають лише ці колонки (база, а не сторінка, ховає шаблон і
// менеджера); без «Launch a template»; без задач — «No tasks assigned to you yet.».
export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const { error } = await searchParams;
  const message = messageFor(error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const userId = data.claims.sub;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (profile?.role ?? null) as Role | null;
  const isVendor = role === "vendor";

  // Вендор таблиць runs і run_tasks не читає (RLS їх закриває, ADR 0008): лише функції з білим списком колонок.
  const runs = await loadRunsList(supabase, userId, isVendor);

  const rows = runListRows(
    (runs ?? []).map((r) => ({
      id: r.id,
      caseName: r.case_name,
      templateName: r.template_name,
      status: r.status as RunStatus,
      createdAt: r.created_at,
      tasks: r.run_tasks.map((t) => ({ status: t.status as TaskStatus })),
    })),
  );
  const yourTasks = new Map(
    (runs ?? []).map((r) => [
      r.id,
      yourTasksLabel(r.run_tasks.map((t) => ({ assigneeId: t.assignee_id, status: t.status as TaskStatus })), userId),
    ]),
  );
  const view = runsListViewFor(role, rows.length);
  const statusOf = new Map((runs ?? []).map((r) => [r.id, r.status as RunStatus]));

  return (
    <AppShell nav={navFor(role)} actions={<SignOutButton />}>
      <PageHeader
        title="Runs"
        actions={
          view.kind === "table" && !isVendor ? (
            <Link href="/runs/new" className={buttonVariants()}>
              Launch a template
            </Link>
          ) : null
        }
      />
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {view.kind === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isVendor ? "Your tasks" : "Progress"}</TableHead>
              {isVendor ? null : <TableHead className="hidden sm:table-cell">Template</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-testid="run-row">
                <TableCell>
                  <Link href={`/runs/${row.id}`} className="text-primary underline-offset-4 hover:underline">
                    {row.caseName}
                  </Link>
                  {isVendor ? null : <span className="block text-muted-foreground sm:hidden">{row.templateName}</span>}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={RUN_STATUS_TONE[statusOf.get(row.id) ?? "in_progress"]}>{row.status}</StatusBadge>
                </TableCell>
                <TableCell data-testid="run-progress" className="tabular-nums">
                  {isVendor ? yourTasks.get(row.id) : row.progress}
                </TableCell>
                {isVendor ? null : <TableCell className="hidden sm:table-cell">{row.templateName}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{view.message}</p>
          {"actionHref" in view ? (
            <Link href={view.actionHref} className={buttonVariants()}>
              {view.actionLabel}
            </Link>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
