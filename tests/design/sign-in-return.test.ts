import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Потік повернення після входу (AC-DSYS-08): справжні updateSession і login, підмінено лише Supabase і redirect.
const auth = {
  getClaims: vi.fn(async () => ({ data: { claims: null } })),
  signInWithPassword: vi.fn(async () => ({ error: null as null | { message: string } })),
};
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
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

const { updateSession } = await import("@/lib/supabase/proxy");
const { login } = await import("@/app/login/actions");

const RUN = "/runs/8b0cd719-5d54-4fa8-964f-27cde2ca7281";
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
};
const redirectOf = async (action: Promise<unknown>) => {
  const error = await action.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(Redirect);
  return (error as Redirect).url;
};

beforeEach(() => {
  auth.signInWithPassword.mockResolvedValue({ error: null });
});

describe("sign-in return flow", () => {
  it("AC-DSYS-08: opening a run link without signing in leads to the sign-in page with the run as next", async () => {
    const response = await updateSession(new NextRequest(`http://localhost${RUN}`));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(RUN);
  });

  it("AC-DSYS-08: after signing in as manager B, the visitor lands on the run page the link led to", async () => {
    const url = await redirectOf(login(form({ email: "member2@example.test", password: "x", next: RUN })));
    expect(url).toBe(RUN);
  });

  it("AC-DSYS-08: a failed sign-in keeps the run as next; a foreign next leads home after sign-in", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const failed = new URL(await redirectOf(login(form({ email: "member2@example.test", password: "x", next: RUN }))), "http://localhost");
    expect(failed.pathname).toBe("/login");
    expect(failed.searchParams.get("error")).toBe("invalid");
    expect(failed.searchParams.get("next")).toBe(RUN);

    auth.signInWithPassword.mockResolvedValue({ error: null });
    expect(await redirectOf(login(form({ email: "member2@example.test", password: "x", next: "/.//evil.example.test" })))).toBe("/");
  });

  it("AC-DSYS-08: a direct action request without a session is sent to sign-in without next", async () => {
    const response = await updateSession(new NextRequest(`http://localhost${RUN}`, { method: "POST" }));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.has("next")).toBe(false);
  });
});
