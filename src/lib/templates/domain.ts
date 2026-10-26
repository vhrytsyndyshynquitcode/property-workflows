// Правила зрізу 2 для сторінок шаблонів (openspec/specs/template-editor, openspec/specs/design-system) як чисті
// функції: хто що бачить, тексти дослівно з AC PM, формат дати версії. Права даних перевіряє база
// (міграція 20261026084454_template_versions.sql): ці функції — для сторінок, дій і тестів з AC ID.

export type Role = "manager" | "admin";

export const TEMPLATE_MESSAGES = {
  notEnoughRights: "Not enough rights",
  backToTemplates: "Back to templates",
  noRequiredTask: "A template needs at least one required task",
  unpublished: "Unpublished changes",
  templateNotFound: "Template not found",
  noTemplates: "No templates yet.",
  failed: "Something went wrong. Try again.",
} as const;

export const versionSavedMessage = (n: number) => `Version ${n} saved`;
export const templateVersionLabel = (n: number) => `Template version ${n}`;

/**
 * AC-DSYS-02, AC-DSYS-03, AC-EDITOR-07, AC-EDITOR-09: доступ до редактора й списку версій.
 * Без входу — сторінка входу; не admin — «Not enough rights» і «Back to templates», без вмісту; admin — дозволено.
 */
export type AdminPageAccess =
  | { kind: "login" }
  | { kind: "denied"; message: typeof TEMPLATE_MESSAGES.notEnoughRights; backLabel: typeof TEMPLATE_MESSAGES.backToTemplates; backHref: "/templates" }
  | { kind: "allowed" };

export function adminPageAccess(role: Role | null | undefined): AdminPageAccess {
  if (!role) return { kind: "login" };
  if (role !== "admin") {
    return {
      kind: "denied",
      message: TEMPLATE_MESSAGES.notEnoughRights,
      backLabel: TEMPLATE_MESSAGES.backToTemplates,
      backHref: "/templates",
    };
  }
  return { kind: "allowed" };
}

/** AC-EDITOR-01, AC-EDITOR-02: позначка «Unpublished changes» — лише адміністратору. */
export function showUnpublishedNotice(role: Role, hasUnpublishedChanges: boolean): boolean {
  return role === "admin" && hasUnpublishedChanges;
}

/** AC-EDITOR-05: дата й час збереження за Києвом у формі DD.MM.YYYY HH:MM. */
export function formatVersionDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`;
}

export type VersionRow = { number: number; createdAt: string; authorEmail: string | null };

/** AC-EDITOR-05: список версій — новіші першими, номер, дата Київ, email автора. */
export function versionListRows(rows: readonly VersionRow[]) {
  return [...rows]
    .sort((a, b) => b.number - a.number)
    .map((r) => ({ number: r.number, savedAt: formatVersionDate(r.createdAt), author: r.authorEmail ?? "—" }));
}

/** Помилка функції бази save_template_version → код для searchParams. */
export type TemplateErrorCode = "no_required_task" | "not_allowed" | "failed";
export function templateErrorCodeForDb(message: string | undefined): TemplateErrorCode {
  if (message?.includes("NO_REQUIRED_TASK")) return "no_required_task";
  if (message?.includes("NOT_ALLOWED")) return "not_allowed";
  return "failed";
}
export function templateMessageFor(code: unknown): string | undefined {
  if (code === "no_required_task") return TEMPLATE_MESSAGES.noRequiredTask;
  if (code === "not_allowed") return TEMPLATE_MESSAGES.notEnoughRights;
  if (code === "failed") return TEMPLATE_MESSAGES.failed;
  return undefined;
}

/** Порядок у редакторі: пересунути елемент на одну позицію вгору чи вниз (обмін позиціями з сусідом). */
export function swapWithNeighbour<T extends { id: string; position: number }>(
  items: readonly T[],
  id: string,
  direction: "up" | "down",
): [T, T] | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const i = sorted.findIndex((x) => x.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sorted.length) return null;
  return [
    { ...sorted[i], position: sorted[j].position },
    { ...sorted[j], position: sorted[i].position },
  ];
}
