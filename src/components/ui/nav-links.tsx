"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

// Пункти навігації з підсвіткою поточного розділу. Активний — пункт із найдовшим href, що є префіксом шляху
// (/runs/new — «Launch a template», а не «Runs»).
export function activeHref(pathname: string, hrefs: readonly string[]): string | undefined {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

function NavLinks({
  items,
  orientation,
  className,
}: {
  items: readonly { href: string; label: string }[]
  orientation: "vertical" | "horizontal"
  className?: string
}) {
  const pathname = usePathname()
  const active = activeHref(pathname, items.map((item) => item.href))

  return (
    <ul className={cn("flex gap-1 text-sm", orientation === "vertical" ? "flex-col" : "flex-wrap", className)}>
      {items.map((item) => {
        const current = item.href === active
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                current
                  ? "bg-primary/12 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export { NavLinks }
