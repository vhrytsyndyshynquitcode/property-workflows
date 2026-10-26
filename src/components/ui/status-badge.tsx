import { cn } from "cn"

// Статус домену на токенах status-* (DESIGN.md, розділ 2): колір завжди разом зі словом статусу (AC-DSYS-01).
const tone = {
  todo: "bg-status-todo text-status-todo-foreground",
  progress: "bg-status-progress text-status-progress-foreground",
  done: "bg-status-done text-status-done-foreground",
  draft: "bg-status-draft text-status-draft-foreground",
} as const

export type StatusTone = keyof typeof tone

function StatusBadge({
  tone: t,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone: StatusTone }) {
  return (
    <span
      data-slot="status-badge"
      data-tone={t}
      className={cn(
        "inline-flex h-6 w-fit items-center rounded-md px-2 text-xs font-medium whitespace-nowrap",
        tone[t],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { StatusBadge }
