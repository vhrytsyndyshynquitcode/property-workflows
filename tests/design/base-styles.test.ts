import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Регресія PR #22: базовий шар globals.css випадково видалили — тло сторінки лишилось білим у темній темі, а шрифт
// Geist не застосовувався. Тут — що базові стилі на місці: тло й колір тексту з токенів, шрифт, тема нативних полів.
const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
const baseLayer = css.slice(css.indexOf("@layer base"));

describe("design-system base styles", () => {
  it("AC-DSYS-01: every page gets the theme background, text colour and font from the tokens", () => {
    expect(css).toContain("@layer base");
    expect(baseLayer).toMatch(/body\s*\{[^}]*@apply bg-background text-foreground/);
    expect(baseLayer).toMatch(/html\s*\{[^}]*@apply font-sans/);
    expect(baseLayer).toMatch(/\*\s*\{[^}]*@apply border-border/);
  });

  it("AC-DSYS-01: native form controls follow the light and dark theme", () => {
    expect(css).toMatch(/:root\s*\{\s*color-scheme: light;/);
    expect(css).toMatch(/prefers-color-scheme: dark\)\s*\{\s*:root\s*\{\s*color-scheme: dark;/);
  });
});
