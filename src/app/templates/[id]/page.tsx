import Link from "next/link";
import { APP_NAV } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";
import { groupBySection } from "@/lib/runs/domain";
import { showUnpublishedNotice, TEMPLATE_MESSAGES } from "@/lib/templates/domain";
import { currentUser } from "@/lib/templates/server";

// Шаблон у поточній збереженій версії (AC-EDITOR-02): менеджер бачить версію без неопублікованих змін і без позначки;
// адміністратор — ще й позначку «Unpublished changes» і посилання на редактор і список версій.
export default async function TemplatePage({ params }: PageProps<"/templates/[id]">) {
  const { id } = await params;
  const { supabase, role } = await currentUser();
  const isAdmin = role === "admin";

  const { data: template } = await supabase
    .from("templates")
    .select("id, name, has_unpublished_changes, current_version_id, current_version:template_versions!templates_current_version_id_fkey(number)")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    return (
      <AppShell nav={APP_NAV} actions={<SignOutButton />}>
        <Alert>
          <AlertTitle>{TEMPLATE_MESSAGES.templateNotFound}</AlertTitle>
        </Alert>
        <Link href="/templates" className="text-sm text-primary underline-offset-4 hover:underline">
          {TEMPLATE_MESSAGES.backToTemplates}
        </Link>
      </AppShell>
    );
  }

  const { data: tasks } = template.current_version_id
    ? await supabase
        .from("version_tasks")
        .select("id, name, is_required, position, section:version_sections(name, position)")
        .eq("version_id", template.current_version_id)
    : { data: null };
  const ordered = [...(tasks ?? [])]
    .sort((a, b) => (a.section?.position ?? 0) - (b.section?.position ?? 0) || a.position - b.position)
    .map((t) => ({ ...t, sectionName: t.section?.name ?? "" }));

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader
        title={template.name}
        description={template.current_version ? `Version ${template.current_version.number}` : "No saved version yet"}
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Link href={`/templates/${template.id}/edit`} className={buttonVariants()}>
                Edit
              </Link>
              <Link href={`/templates/${template.id}/versions`} className={buttonVariants({ variant: "outline" })}>
                Versions
              </Link>
            </div>
          ) : null
        }
      />
      {role && showUnpublishedNotice(role, template.has_unpublished_changes) ? (
        <StatusBadge tone="draft">{TEMPLATE_MESSAGES.unpublished}</StatusBadge>
      ) : null}
      {groupBySection(ordered).map((group) => (
        <Card key={group.section}>
          <CardContent className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{group.section}</h2>
            <ul className="flex flex-col divide-y divide-border">
              {group.tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm" data-testid="version-task">
                  <span>{task.name}</span>
                  <span className="text-muted-foreground">{task.is_required ? "required" : "optional"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}
