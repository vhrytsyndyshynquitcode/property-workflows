import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { parseThemeChoice, resolveTheme, THEME_INIT_SCRIPT, THEME_OPTIONS, THEME_STORAGE_KEY } from "@/lib/theme";

// Вибір теми (ADR 0007). Скрипт у <head> запускаємо в пісочниці зі штучними localStorage, matchMedia і document —
// саме він визначає тему до першого кадру.
function runInitScript({ stored, deviceDark }: { stored: string | null; deviceDark: boolean }) {
  const attributes: Record<string, string> = {};
  runInNewContext(THEME_INIT_SCRIPT, {
    localStorage: { getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null) },
    window: { matchMedia: (query: string) => ({ matches: query.includes("dark") && deviceDark }) },
    document: { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } },
  });
  return attributes["data-theme"];
}

describe("theme choice", () => {
  it('AC-DSYS-05: with no choice made and a dark device, the page is dark and "Theme" shows "System"', () => {
    expect(runInitScript({ stored: null, deviceDark: true })).toBe("dark");
    expect(parseThemeChoice(null)).toBe("system");
    expect(THEME_OPTIONS.find((option) => option.value === parseThemeChoice(null))?.label).toBe("System");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it('AC-DSYS-06: "Light" chosen on a dark device stays light after the browser is reopened, "Theme" shows "Light"', () => {
    // Вибір зберігається на пристрої: два «відкриття» з тим самим localStorage.
    expect(runInitScript({ stored: "light", deviceDark: true })).toBe("light");
    expect(runInitScript({ stored: "light", deviceDark: true })).toBe("light");
    expect(THEME_OPTIONS.find((option) => option.value === parseThemeChoice("light"))?.label).toBe("Light");
    expect(runInitScript({ stored: "dark", deviceDark: false })).toBe("dark");
    expect(parseThemeChoice("purple")).toBe("system");
  });
});

// OKLCH → лінійний sRGB → відносна яскравість (WCAG 2.x), як у таблиці контрасту DESIGN.md.
function luminance([l, c, h]: number[]) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const bl = clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
const contrast = (x: number[], y: number[]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

describe("statuses in the dark theme", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
  const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"] {'), css.indexOf("}", css.indexOf(':root[data-theme="dark"] {')));
  const token = (name: string) => {
    const match = darkBlock.match(new RegExp(`--${name}: oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`));
    if (!match) throw new Error(`no dark token ${name}`);
    return match.slice(1).map(Number);
  };

  it('AC-DSYS-07: "in progress" is blue and "completed" green in the dark theme, with text contrast of at least 4.5 to 1', () => {
    const progress = [token("status-progress-foreground"), token("status-progress")];
    const done = [token("status-done-foreground"), token("status-done")];
    // Синій і зелений, як у світлій темі (відтінок OKLCH).
    expect(progress[1][2]).toBeGreaterThan(220);
    expect(progress[1][2]).toBeLessThan(270);
    expect(done[1][2]).toBeGreaterThan(120);
    expect(done[1][2]).toBeLessThan(170);
    expect(contrast(progress[0], progress[1])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(done[0], done[1])).toBeGreaterThanOrEqual(4.5);
  });
});
