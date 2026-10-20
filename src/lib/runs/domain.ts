// Правила зрізу workflow-runs як чисті функції (openspec/specs/run-launch, openspec/specs/task-completion).
// Ті самі правила база перевіряє у функціях public.launch_run і public.mark_task_done (міграція зрізу):
// тут вони — для повідомлень користувачу й тестів з AC ID.

export type Role = "manager" | "admin";
export type TaskStatus = "to_do" | "done";
export type RunStatus = "in_progress" | "completed";

export const MESSAGES = {
  caseNameEmpty: "Enter a case name",
  caseNameTooLong: "Case name must be at most 100 characters",
  notAllowedToMark: "Only the task's assignee, the run manager, or an administrator can mark a task as done",
} as const;

export const CASE_NAME_MAX = 100;

/** Коди помилок (у searchParams сторінок) → тексти PM дослівно. */
export const ERROR_MESSAGES = {
  case_name_empty: MESSAGES.caseNameEmpty,
  case_name_too_long: MESSAGES.caseNameTooLong,
  not_allowed: MESSAGES.notAllowedToMark,
  template_not_found: "Pick a template",
  invalid_assignee: "An assignee must be a manager or an administrator",
  failed: "Something went wrong. Try again.",
} as const;
export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function messageFor(code: unknown): string | undefined {
  return typeof code === "string" && code in ERROR_MESSAGES ? ERROR_MESSAGES[code as ErrorCode] : undefined;
}

export type CaseNameCheck =
  | { ok: true; value: string }
  | { ok: false; code: "case_name_empty" | "case_name_too_long"; message: string };

/** AC-RUN-03, AC-RUN-07: назва випадку — 1–100 символів; лише пробіли — порожня. */
export function validateCaseName(raw: string): CaseNameCheck {
  const value = raw.trim();
  // Символи (code points), як length() у Postgres, а не UTF-16 code units: емодзі — один символ.
  const length = [...value].length;
  if (length === 0) return { ok: false, code: "case_name_empty", message: MESSAGES.caseNameEmpty };
  if (length > CASE_NAME_MAX) return { ok: false, code: "case_name_too_long", message: MESSAGES.caseNameTooLong };
  return { ok: true, value };
}

export type TemplateTask = { id: string; name: string; sectionName: string; isRequired: boolean };
export type RunTask = {
  id: string;
  name: string;
  sectionName: string;
  isRequired: boolean;
  assigneeId: string;
  status: TaskStatus;
};
export type Run = {
  id: string;
  caseName: string;
  templateName: string;
  runManagerId: string;
  status: RunStatus;
  tasks: RunTask[];
};

/**
 * AC-RUN-01, AC-RUN-02, AC-RUN-04..06, AC-RUN-08, AC-RUN-09: запуск — знімок задач шаблону на момент запуску,
 * усі «to do», менеджер запуску — той, хто запускає, задачі без призначення — менеджеру запуску.
 */
export function buildRun(input: {
  id: string;
  templateName: string;
  templateTasks: readonly TemplateTask[];
  caseName: string;
  launchedBy: string;
  assignments?: Readonly<Record<string, string>>;
}): Run {
  return {
    id: input.id,
    caseName: input.caseName,
    templateName: input.templateName,
    runManagerId: input.launchedBy,
    status: "in_progress",
    tasks: input.templateTasks.map((t) => ({
      id: `${input.id}:${t.id}`,
      name: t.name,
      sectionName: t.sectionName,
      isRequired: t.isRequired,
      assigneeId: input.assignments?.[t.id] ?? input.launchedBy,
      status: "to_do",
    })),
  };
}

export type Actor = { id: string; role: Role };

/** AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-07: хто може позначити задачу виконаною. */
export function canMarkDone(actor: Actor, run: Pick<Run, "runManagerId">, task: Pick<RunTask, "assigneeId">): boolean {
  return actor.role === "admin" || task.assigneeId === actor.id || run.runManagerId === actor.id;
}

export type MarkResult = { ok: true; run: Run } | { ok: false; message: string; run: Run };

/** AC-TASK-01..04, AC-TASK-07: позначка «done»; запуск «completed», коли виконано всі обов'язкові задачі. */
export function markTaskDone(run: Run, taskId: string, actor: Actor): MarkResult {
  const task = run.tasks.find((t) => t.id === taskId);
  if (!task || !canMarkDone(actor, run, task)) {
    return { ok: false, message: MESSAGES.notAllowedToMark, run };
  }
  if (task.status === "done") return { ok: true, run };
  const tasks = run.tasks.map((t) => (t.id === taskId ? { ...t, status: "done" as const } : t));
  return { ok: true, run: { ...run, tasks, status: runStatusFor(tasks, run.status) } };
}

/** AC-TASK-04: статус запуску за обов'язковими задачами; необов'язкові не впливають. */
export function runStatusFor(tasks: readonly Pick<RunTask, "isRequired" | "status">[], current: RunStatus = "in_progress"): RunStatus {
  if (current === "completed") return "completed";
  return tasks.filter((t) => t.isRequired).every((t) => t.status === "done") ? "completed" : "in_progress";
}

/** AC-TASK-05, AC-TASK-09: прогрес «N of M done» — усі задачі запуску, обов'язкові й ні. */
export function progressLabel(tasks: readonly Pick<RunTask, "status">[]): string {
  const done = tasks.filter((t) => t.status === "done").length;
  return `${done} of ${tasks.length} done`;
}

/** AC-TASK-06: менеджер бачить запуски, де він менеджер запуску або виконавець хоча б однієї задачі; адміністратор — усі. */
export function canSeeRun(actor: Actor, run: Pick<Run, "runManagerId" | "tasks">): boolean {
  return actor.role === "admin" || run.runManagerId === actor.id || run.tasks.some((t) => t.assigneeId === actor.id);
}

export function visibleRuns<T extends Pick<Run, "runManagerId" | "tasks">>(actor: Actor, runs: readonly T[]): T[] {
  return runs.filter((r) => canSeeRun(actor, r));
}

/** Тексти статусів дослівно, як у PM. */
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { to_do: "to do", done: "done" };
export const RUN_STATUS_LABEL: Record<RunStatus, string> = { in_progress: "in progress", completed: "completed" };

/** Помилка функції бази (raise exception 'CASE_NAME_EMPTY' тощо) → код для searchParams. */
export function errorCodeForDb(message: string | undefined): ErrorCode {
  if (message?.includes("CASE_NAME_EMPTY")) return "case_name_empty";
  if (message?.includes("CASE_NAME_TOO_LONG")) return "case_name_too_long";
  if (message?.includes("NOT_ALLOWED")) return "not_allowed";
  if (message?.includes("TEMPLATE_NOT_FOUND")) return "template_not_found";
  if (message?.includes("INVALID_ASSIGNEE")) return "invalid_assignee";
  return "failed";
}

/** Рядки задач для сторінки запуску, згруповані за розділом у порядку задач (AC-TASK-08). */
export function groupBySection<T extends { sectionName: string }>(tasks: readonly T[]): { section: string; tasks: T[] }[] {
  const groups: { section: string; tasks: T[] }[] = [];
  for (const t of tasks) {
    const last = groups.at(-1);
    if (last && last.section === t.sectionName) last.tasks.push(t);
    else groups.push({ section: t.sectionName, tasks: [t] });
  }
  return groups;
}
