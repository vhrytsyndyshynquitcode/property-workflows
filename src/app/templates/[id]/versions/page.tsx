import { APP_NAV } from "@/components/app/app-nav";
import { NotEnoughRights } from "@/components/app/not-enough-rights";
import { SignOutButton } from "@/components/app/sign-out-button";
import { AppShell, PageHeader } from "@/components/ui/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminPageAccess, versionListRows } from "@/lib/templates/domain";
import { currentUser } from "@/lib/templates/server";

// Список версій (AC-EDITOR-05): номер, «DD.MM.YYYY HH:MM» за Києвом, email адміністратора, новіші першими.
// Менеджер за прямим посиланням — «Not enough rights» і жодної версії (AC-EDITOR-07): запит версій не виконуємо.
export default async function VersionsPage({ params }: PageProps<"/templates/[id]/versions">) {
  const { id } = await params;
  const { supabase, role } = await currentUser();
  const access = adminPageAccess(role);

  if (access.kind !== "allowed") {
    return (
      <AppShell nav={APP_NAV} actions={<SignOutButton />}>
        <PageHeader title="Versions" />
        <NotEnoughRights />
      </AppShell>
    );
  }

  const [{ data: template }, { data: versions }] = await Promise.all([
    supabase.from("templates").select("name").eq("id", id).maybeSingle(),
    supabase
      .from("template_versions")
      .select("number, created_at, author:profiles!template_versions_created_by_fkey(email)")
      .eq("template_id", id),
  ]);
  const rows = versionListRows(
    (versions ?? []).map((v) => ({ number: v.number, createdAt: v.created_at, authorEmail: v.author?.email ?? null })),
  );

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader title="Versions" description={template?.name} />
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Saved</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.number} data-testid="version-row">
                <TableCell className="tabular-nums">{r.number}</TableCell>
                <TableCell className="tabular-nums">{r.savedAt}</TableCell>
                <TableCell>{r.author}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">No versions yet.</p>
      )}
    </AppShell>
  );
}
