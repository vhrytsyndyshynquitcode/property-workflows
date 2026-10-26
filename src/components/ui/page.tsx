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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-foreground">
            Property workflows
          </Link>
          {nav && nav.length > 0 ? (
            <nav aria-label="Main" className="flex flex-wrap gap-4 text-sm">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="text-foreground underline-offset-4 hover:underline">
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
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export { AppShell, PageHeader }
