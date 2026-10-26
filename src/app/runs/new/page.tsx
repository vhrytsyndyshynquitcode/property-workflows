import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAV } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AppShell, PageHeader } from "@/components/ui/page";
import { assigneeOptions, CASE_NAME_MAX, messageFor } from "@/lib/runs/domain";
import { createClient } from "@/lib/supabase/server";
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

  const { data: templates } = await supabase.from("templates").select("id, name").order("name");
  const selected = templates?.find((t) => t.id === templateId);

  const { data: tasks } = selected
    ? await supabase
        .from("template_tasks")
        .select("id, name, is_required, position, template_sections(name, position)")
        .eq("template_id", selected.id)
    : { data: null };
  const sortedTasks = [...(tasks ?? [])].sort(
    (a, b) =>
      (a.template_sections?.position ?? 0) - (b.template_sections?.position ?? 0) || a.position - b.position,
  );

  const { data: users } = selected ? await supabase.rpc("list_assignable_users") : { data: null };
  const others = assigneeOptions(users ?? [], claims.sub);

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader title="Launch a template" description="Pick a template, name the case and assign tasks." />
      <nav aria-label="Templates" className="flex flex-wrap gap-2">
        {(templates ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/runs/new?template=${t.id}`}
            aria-current={t.id === selected?.id ? "page" : undefined}
            className={buttonVariants({ variant: t.id === selected?.id ? "secondary" : "outline", size: "sm" })}
          >
            {t.name}
          </Link>
        ))}
      </nav>
      {selected ? (
        <Card>
          <CardContent>
            <form action={launchRun} className="flex flex-col gap-5">
              <input type="hidden" name="templateId" value={selected.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="caseName">Case name</Label>
                <Input id="caseName" name="caseName" placeholder="Apartment 12, move-in" maxLength={CASE_NAME_MAX + 50} />
              </div>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium">Assignees</legend>
                {sortedTasks.map((task) => (
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={`assignee-${task.id}`} className="font-normal">
                      {task.name}
                      <span className="text-muted-foreground">
                        {" "}
                        ({task.template_sections?.name} · {task.is_required ? "required" : "optional"})
                      </span>
                    </Label>
                    <NativeSelect id={`assignee-${task.id}`} name={`assignee:${task.id}`} defaultValue="">
                      <option value="">Me (run manager)</option>
                      {others.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ))}
              </fieldset>
              {message ? (
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" size="lg" className="self-start">
                Launch
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Pick a template.</p>
      )}
    </AppShell>
  );
}
