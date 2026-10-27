import { beforeEach, describe, expect, it, vi } from "vitest";

// Дія редактора updateTask (AC-EDITOR-20): справжня дія, підмінено лише клієнт Supabase і redirect. Обмеження бази
// template_tasks_name_check відхиляє порожню назву — сторінка має отримати текст з AC, а не загальну помилку.
const TEMPLATE = "00000000-0000-4000-8000-000000000001";
const TASK = "00000000-0000-4000-8000-000000000201";
const updateResult = { data: null as unknown[] | null, error: null as { message: string } | null };

// Ланцюжок запитів supabase-js: from(...).select/update(...).eq(...).eq(...).select/maybeSingle().
function query(table: string) {
  const chain = {
    select: () => chain,
    update: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: table === "profiles" ? { role: "admin" } : null, error: null }),
    then: (resolve: (value: typeof updateResult) => unknown) => resolve(updateResult),
  };
  return chain;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "a0000000-0000-0000-0000-000000000001" } } }) },
    from: query,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const { updateTask } = await import("@/app/templates/actions");
const { templateMessageFor } = await import("@/lib/templates/domain");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
};
const redirectOf = async (action: Promise<unknown>) => {
  const error = await action.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(Redirect);
  return new URL((error as Redirect).url, "http://localhost");
};

beforeEach(() => {
  updateResult.data = [{ id: TASK }];
  updateResult.error = null;
});

describe("template-editor actions", () => {
  it('AC-EDITOR-20: clearing a task name in the editor shows "Every section and task needs a name"', async () => {
    updateResult.data = null;
    updateResult.error = {
      message: 'new row for relation "template_tasks" violates check constraint "template_tasks_name_check"',
    };
    const url = await redirectOf(updateTask(form({ templateId: TEMPLATE, taskId: TASK, name: "   " })));
    expect(url.pathname).toBe(`/templates/${TEMPLATE}/edit`);
    expect(templateMessageFor(url.searchParams.get("error"))).toBe("Every section and task needs a name");
  });

  it("AC-EDITOR-01: a successful task update returns to the editor without an error", async () => {
    const url = await redirectOf(updateTask(form({ templateId: TEMPLATE, taskId: TASK, name: "Sign the lease" })));
    expect(url.searchParams.has("error")).toBe(false);
  });

  it("ignores inherited keys in the error parameter instead of breaking the page", () => {
    for (const key of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
      expect(templateMessageFor(key)).toBeUndefined();
    }
  });
});
