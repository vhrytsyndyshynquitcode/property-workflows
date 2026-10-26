import Link from "next/link"
import { cn } from "cn"

// Спільний макет сторінок (AC-DSYS-02, AC-DSYS-03): та сама шапка, ширина й місце для повідомлень на кожній сторінці.
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
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Property workflows
          </Link>
          {nav && nav.length > 0 ? (
            <nav aria-label="Main" className="flex flex-wrap gap-1 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {actions}
        </div>
      </header>
      <main className={cn("mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6", className)}>
        {children}
      </main>
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
