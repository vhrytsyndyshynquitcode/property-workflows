import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_NAV } from "@/components/app/app-nav";
import { activeHref } from "@/components/ui/nav-links";

// Бічна навігація (ADR 0005) і спокійні робочі сторінки (ADR 0006: «Вигляд і тон» PM — «bright gradients, decorative
// animation» не підходять). Не AC PM, а дизайн-система: тести без AC ID.
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

describe("calm work pages", () => {
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

  it("has no decorative background animation or gradient on work pages", () => {
    const css = read("src/app/globals.css");
    expect(css).not.toMatch(/bg-aurora|@keyframes aurora|radial-gradient/);
    expect(read("src/components/ui/page.tsx")).not.toMatch(/bg-aurora|bg-linear|bg-radial/);
  });

  it("adds no click effects or corner mascot to every page", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).not.toMatch(/ClickBurst|MochiCorner|MochiPuff/);
  });
});
