import type { Role } from "@/lib/templates/domain";

// Пункти навігації спільного макета (AC-DSYS-02): однакові на кожній сторінці для того, хто увійшов.
export const APP_NAV = [
  { href: "/templates", label: "Templates" },
  { href: "/runs", label: "Runs" },
  { href: "/runs/new", label: "Launch a template" },
];

// Вендор не працює з шаблонами й не запускає їх (матриця прав; AC-VENDOR-08, AC-VENDOR-09): лише «Runs».
// Рішення до відповіді PM на solomchaak/property-workflows-spec#44.
export const VENDOR_NAV = [{ href: "/runs", label: "Runs" }];

export function navFor(role: Role | null | undefined) {
  return role === "vendor" ? VENDOR_NAV : APP_NAV;
}
