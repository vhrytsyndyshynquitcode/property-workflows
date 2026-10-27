import Link from "next/link";
import { APP_NAV } from "@/components/app/app-nav";
import { NotEnoughRights } from "@/components/app/not-enough-rights";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeCheckbox } from "@/components/ui/native-checkbox";
import { AppShell, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  adminPageAccess,
  canSaveVersion,
  removalTarget,
  TEMPLATE_MESSAGES,
  templateMessageFor,
  versionSavedMessage,
} from "@/lib/templates/domain";
import { currentUser } from "@/lib/templates/server";
import {
  addSection,
  addTask,
  moveSection,
  moveTask,
  moveTaskToSection,
  removeSection,
  removeTask,
  renameSection,
  saveVersion,
  updateTask,
} from "../../actions";

// Редактор (AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-12 — «Save» лише за змін, AC-EDITOR-13/14 —
// видалення з підтвердженням, AC-EDITOR-28 — перенесення задачі в інший розділ). Без входу — сторінка входу (currentUser, AC-EDITOR-09);
// менеджер — «Not enough rights» і «Back to templates», без вмісту редактора (AC-DSYS-02). Кожна правка — одразу в
// базі як неопубліковані зміни; «Save» — нова версія.
export default async function EditTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/edit">) {
  const { id } = await params;
  const { error, saved, remove } = await searchParams;
  const removal = removalTarget(remove);
  const { supabase, role } = await currentUser();
  const access = adminPageAccess(role);

  if (access.kind !== "allowed") {
    return (
      <AppShell nav={APP_NAV} actions={<SignOutButton />}>
        <PageHeader title="Edit template" />
        <NotEnoughRights />
      </AppShell>
    );
  }

  const { data: template } = await supabase
    .from("templates")
    .select("id, name, has_unpublished_changes")
    .eq("id", id)
    .maybeSingle();
  if (!template) {
    return (
      <AppShell nav={APP_NAV} actions={<SignOutButton />}>
        <PageHeader title="Edit template" />
        <Alert>
          <AlertTitle>{TEMPLATE_MESSAGES.templateNotFound}</AlertTitle>
        </Alert>
      </AppShell>
    );
  }

  const [{ data: sections }, { data: tasks }] = await Promise.all([
    supabase.from("template_sections").select("id, name, position").eq("template_id", id).order("position"),
    supabase.from("template_tasks").select("id, section_id, name, is_required, position").eq("template_id", id).order("position"),
  ]);
  const errorMessage = templateMessageFor(error);
  const savedNumber = typeof saved === "string" ? Number(saved) : NaN;

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader
        title={template.name}
        description="Changes are kept automatically. Save to publish them as a new version."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {template.has_unpublished_changes ? (
              <StatusBadge tone="draft">{TEMPLATE_MESSAGES.unpublished}</StatusBadge>
            ) : null}
            {canSaveVersion(template.has_unpublished_changes) ? (
              <form action={saveVersion}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit">Save</Button>
              </form>
            ) : null}
            <Link href={`/templates/${template.id}/versions`} className={buttonVariants({ variant: "outline" })}>
              Versions
            </Link>
          </div>
        }
      />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {Number.isInteger(savedNumber) && savedNumber > 0 ? (
        <Alert>
          <AlertDescription>{versionSavedMessage(savedNumber)}</AlertDescription>
        </Alert>
      ) : null}

      {(sections ?? []).map((section, si, all) => (
        <Card key={section.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <form action={renameSection} className="flex flex-1 items-end gap-2">
                <input type="hidden" name="templateId" value={template.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor={`section-${section.id}`}>Section</Label>
                  <Input id={`section-${section.id}`} name="name" defaultValue={section.name} />
                </div>
                <Button type="submit" variant="outline" size="sm">
                  Rename
                </Button>
              </form>
              <form action={moveSection}>
                <input type="hidden" name="templateId" value={template.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" variant="ghost" size="sm" disabled={si === 0}>
                  Move up
                </Button>
              </form>
              <form action={moveSection}>
                <input type="hidden" name="templateId" value={template.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="direction" value="down" />
                <Button type="submit" variant="ghost" size="sm" disabled={si === all.length - 1}>
                  Move down
                </Button>
              </form>
              <Link
                href={`?remove=section:${section.id}`}
                scroll={false}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Remove section
              </Link>
            </div>
            {removal?.kind === "section" && removal.id === section.id ? (
              <Alert variant="destructive" data-testid="confirm-remove">
                <AlertTitle>Remove «{section.name}»?</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  {TEMPLATE_MESSAGES.cannotBeUndone}
                  <div className="flex gap-2">
                    <form action={removeSection}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Confirm
                      </Button>
                    </form>
                    <Link href="?" scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Cancel
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <ul className="flex flex-col divide-y divide-border">
              {(tasks ?? [])
                .filter((t) => t.section_id === section.id)
                .map((task, ti, sectionTasks) => (
                  <li key={task.id} className="flex flex-wrap items-end gap-2 py-2" data-testid="draft-task">
                    <form action={updateTask} className="flex flex-1 flex-wrap items-end gap-2">
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <div className="flex min-w-48 flex-1 flex-col gap-1">
                        <Label htmlFor={`task-${task.id}`}>Task</Label>
                        <Input id={`task-${task.id}`} name="name" defaultValue={task.name} />
                      </div>
                      <Label className="flex items-center gap-2 font-normal">
                        <NativeCheckbox name="required" defaultChecked={task.is_required} />
                        Required
                      </Label>
                      <Button type="submit" variant="outline" size="sm">
                        Update
                      </Button>
                    </form>
                    <form action={moveTask}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button type="submit" variant="ghost" size="sm" disabled={ti === 0}>
                        Up
                      </Button>
                    </form>
                    <form action={moveTask}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button type="submit" variant="ghost" size="sm" disabled={ti === sectionTasks.length - 1}>
                        Down
                      </Button>
                    </form>
                    {all.length > 1 ? (
                      <form action={moveTaskToSection} className="flex items-end gap-2">
                        <input type="hidden" name="templateId" value={template.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <Label htmlFor={`move-${task.id}`} className="sr-only">
                          Move to section
                        </Label>
                        <NativeSelect id={`move-${task.id}`} name="toSectionId" defaultValue="">
                          <option value="" disabled>
                            Move to…
                          </option>
                          {all
                            .filter((other) => other.id !== section.id)
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.name || "Untitled section"}
                              </option>
                            ))}
                        </NativeSelect>
                        <Button type="submit" variant="ghost" size="sm">
                          Move
                        </Button>
                      </form>
                    ) : null}
                    <Link
                      href={`?remove=task:${task.id}`}
                      scroll={false}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Remove
                    </Link>
                    {removal?.kind === "task" && removal.id === task.id ? (
                      <Alert variant="destructive" className="w-full" data-testid="confirm-remove">
                        <AlertTitle>Remove «{task.name}»?</AlertTitle>
                        <AlertDescription className="flex flex-col gap-3">
                          {TEMPLATE_MESSAGES.cannotBeUndone}
                          <div className="flex gap-2">
                            <form action={removeTask}>
                              <input type="hidden" name="templateId" value={template.id} />
                              <input type="hidden" name="taskId" value={task.id} />
                              <Button type="submit" variant="destructive" size="sm">
                                Confirm
                              </Button>
                            </form>
                            <Link href="?" scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              Cancel
                            </Link>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </li>
                ))}
            </ul>

            <form action={addTask} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="templateId" value={template.id} />
              <input type="hidden" name="sectionId" value={section.id} />
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <Label htmlFor={`new-task-${section.id}`}>New task</Label>
                <Input id={`new-task-${section.id}`} name="name" placeholder="Sign handover act" />
              </div>
              <Label className="flex items-center gap-2 font-normal">
                <NativeCheckbox name="required" />
                Required
              </Label>
              <Button type="submit" variant="secondary" size="sm">
                Add task
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent>
          <form action={addSection} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Label htmlFor="new-section">New section</Label>
              <Input id="new-section" name="name" placeholder="Move-in day" />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Add section
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
