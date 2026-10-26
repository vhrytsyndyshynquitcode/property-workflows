import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_NAV } from "@/components/app/app-nav";
import { activeHref } from "@/components/ui/nav-links";

// Бічна навігація й тло робочих сторінок (ADR 0005). Не вимоги PM, а дизайн-система: тести без AC ID.
const hrefs = APP_NAV.map((item) => item.href);

describe("sidebar navigation", () => {
  it("highlights the section of the current page, preferring the most specific item", () => {
    expect(activeHref("/runs", hrefs)).toBe("/runs");
    expect(activeHref("/runs/42", hrefs)).toBe("/runs");
    expect(activeHref("/runs/new", hrefs)).toBe("/runs/new");
    expect(activeHref("/templates/abc/edit", hrefs)).toBe("/templates");
    expect(activeHref("/", hrefs)).toBeUndefined();
    expect(activeHref("/runsandmore", hrefs)).toBeUndefined();
  });
});

describe("aurora background", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

  it("uses only the Mochi and primary tokens and drifts only when motion is allowed", () => {
    const aurora = css.slice(css.indexOf("@utility bg-aurora"), css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(aurora).toContain("var(--mochi-violet)");
    expect(aurora).toContain("var(--mochi-pink)");
    expect(aurora).toContain("var(--primary)");
    expect(aurora).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*@keyframes aurora-drift/);
  });
});
