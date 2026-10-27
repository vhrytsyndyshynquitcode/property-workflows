// Вибір теми (AC-DSYS-05, AC-DSYS-06, ADR 0007): «System» (типово, за пристроєм), «Light», «Dark». Вибір зберігається
// на пристрої (localStorage), не в профілі, і діє на всіх сторінках, зокрема на вході.

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(choice: ThemeChoice, deviceIsDark: boolean): Theme {
  if (choice === "system") return deviceIsDark ? "dark" : "light";
  return choice;
}

// Скрипт у <head> до першого кадру: ставить data-theme на <html>, щоб сторінка не блимала світлою темою.
// Та сама логіка, що parseThemeChoice + resolveTheme; без localStorage (приватний режим) — «System».
export const THEME_INIT_SCRIPT = `(function(){var c="system";try{c=localStorage.getItem("${THEME_STORAGE_KEY}")||"system"}catch(e){}var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")})();`;
