import Link from "next/link"
import { cn } from "cn"
import { NavLinks } from "./nav-links"

const BRAND_CLASS =
  "rounded-md text-sm font-semibold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

// Спільний макет сторінок (AC-DSYS-02, AC-DSYS-03): та сама навігація, ширина й місце для повідомлень на кожній
// сторінці. Робочі сторінки (є nav) — бічна панель зліва від md, на телефоні — верхня смуга; тло — bg-aurora
// (ADR 0005). Вхід і 404 (без nav) — проста шапка з назвою.
function AppShell({
  nav,
  actions,
  className,
  children,
}: {
  nav?: { href: string; label: string }[]
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const content = (
    <main className={cn("mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6", className)}>
      {children}
    </main>
  )

  if (!nav || nav.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className={BRAND_CLASS}>
              Property workflows
            </Link>
            {actions}
          </div>
        </header>
        {content}
      </div>
    )
  }

  return (
    <div className="bg-aurora flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 z-10 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70 md:h-svh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:h-full md:flex-col md:flex-nowrap md:items-stretch md:justify-start md:gap-6 md:px-3 md:py-5">
          <Link href="/" className={cn(BRAND_CLASS, "md:px-3 md:text-base")}>
            Property workflows
          </Link>
          <nav aria-label="Main" className="order-last w-full md:order-none md:flex-1">
            <NavLinks items={nav} orientation="horizontal" className="md:hidden" />
            <NavLinks items={nav} orientation="vertical" className="hidden md:flex" />
          </nav>
          {actions ? <div className="md:px-3">{actions}</div> : null}
        </div>
      </aside>
      {content}
    </div>
  )
}

function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export { AppShell, PageHeader }
