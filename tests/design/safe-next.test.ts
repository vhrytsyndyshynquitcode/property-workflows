import { describe, expect, it } from "vitest";
import { nextParamFor, safeNextPath } from "@/lib/auth/safe-next";

// Повернення на сторінку посилання після входу (AC-DSYS-08) і захист від відкритого перенаправлення (CWE-601).
describe("return to the linked page after sign-in", () => {
  it('AC-DSYS-08: a visitor sent to sign-in from a run link lands on that run page after signing in', () => {
    const next = nextParamFor("/runs/8b0cd719-5d54-4fa8-964f-27cde2ca7281", "");
    expect(next).toBe("/runs/8b0cd719-5d54-4fa8-964f-27cde2ca7281");
    // Дія входу перенаправляє саме сюди.
    expect(safeNextPath(next)).toBe("/runs/8b0cd719-5d54-4fa8-964f-27cde2ca7281");
    expect(safeNextPath("/templates/abc/edit?saved=2")).toBe("/templates/abc/edit?saved=2");
  });

  it("never leaves the application: external, protocol-relative and malformed addresses fall back to home", () => {
    for (const value of [
      "https://evil.example.test/runs",
      "//evil.example.test",
      "/\\evil.example.test",
      "javascript:alert(1)",
      "runs/1",
      "/runs/1\nSet-Cookie: x",
      "",
      undefined,
      ["/runs/1"],
    ]) {
      expect(safeNextPath(value)).toBe("/");
    }
    // Повернення на сам вхід зациклило б.
    expect(safeNextPath("/login?next=/runs")).toBe("/");
    expect(nextParamFor("/", "")).toBeUndefined();
  });
});
