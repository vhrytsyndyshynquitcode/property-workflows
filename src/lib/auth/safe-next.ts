// Куди повернути після входу з прямого посилання (AC-DSYS-08). Лише внутрішній шлях застосунку: адреса з запиту не
// може вивести на інший сайт (відкрите перенаправлення, CWE-601). Інакше — головна.
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return "/";
  // Лише шлях від кореня: не «//host», не «/\host», не схема й не керувальні символи.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f\\]/.test(value)) return "/";
  let url: URL;
  try {
    url = new URL(value, "http://app.invalid");
  } catch {
    return "/";
  }
  if (url.origin !== "http://app.invalid") return "/";
  // Ще раз — після нормалізації: «/.//evil.example» стає шляхом «//evil.example», а redirect сприйняв би його як
  // адресу іншого сайту.
  if (url.pathname.startsWith("//") || url.pathname.startsWith("/\\")) return "/";
  // Повернення на сам вхід зациклило б користувача.
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Шлях запиту, який відвідувач без входу хотів відкрити — для ?next= на сторінці входу. */
export function nextParamFor(pathname: string, search: string): string | undefined {
  const target = safeNextPath(`${pathname}${search}`);
  return target === "/" ? undefined : target;
}
