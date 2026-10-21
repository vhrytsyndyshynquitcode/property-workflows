import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { messageFor, runListRows, type RunStatus, type TaskStatus } from "@/lib/runs/domain";

// Список запусків (AC-TASK-06, AC-TASK-09, AC-TASK-13, AC-TASK-14, AC-TASK-17). Які запуски видно, вирішує RLS
// (private.can_see_run): менеджер — свої й ті, де він виконавець; адміністратор — усі. Рядок — випадок, шаблон,
// статус і прогрес; новіші першими.
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <Link href="/runs/new" className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background">
          Launch a template
        </Link>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-2 font-normal">Case</th>
              <th className="py-2 font-normal">Template</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal">Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800" data-testid="run-row">
                <td className="py-2">
                  <Link href={`/runs/${row.id}`} className="underline">
                    {row.caseName}
                  </Link>
                </td>
                <td className="py-2">{row.templateName}</td>
                <td className="py-2">{row.status}</td>
                <td className="py-2" data-testid="run-progress">
                  {row.progress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-zinc-500">No runs yet.</p>
      )}
      <Link href="/" className="text-sm underline">
        Home
      </Link>
    </main>
  );
}
