import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAV } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AppShell, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { messageFor, NO_RUNS, RUN_STATUS_TONE, runListRows, type RunStatus, type TaskStatus } from "@/lib/runs/domain";
import { createClient } from "@/lib/supabase/server";

// Список запусків (AC-TASK-06, AC-TASK-09, AC-TASK-13, AC-TASK-14, AC-TASK-17, AC-DSYS-01, AC-DSYS-04). Які запуски
// видно, вирішує RLS (private.can_see_run): менеджер — свої й ті, де він виконавець; адміністратор — усі.
export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const { error } = await searchParams;
  const message = messageFor(error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: runs } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, created_at, run_tasks(status)");

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
  const statusOf = new Map((runs ?? []).map((r) => [r.id, r.status as RunStatus]));

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader
        title="Runs"
        actions={
          rows.length > 0 ? (
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
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="hidden sm:table-cell">Template</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-testid="run-row">
                <TableCell>
                  <Link href={`/runs/${row.id}`} className="text-primary underline-offset-4 hover:underline">
                    {row.caseName}
                  </Link>
                  <span className="block text-muted-foreground sm:hidden">{row.templateName}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={RUN_STATUS_TONE[statusOf.get(row.id) ?? "in_progress"]}>{row.status}</StatusBadge>
                </TableCell>
                <TableCell data-testid="run-progress" className="tabular-nums">
                  {row.progress}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{row.templateName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{NO_RUNS}</p>
          <Link href="/runs/new" className={buttonVariants()}>
            Launch a template
          </Link>
        </div>
      )}
    </AppShell>
  );
}
