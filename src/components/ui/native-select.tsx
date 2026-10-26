import { cn } from "cn"

// Нативний <select> на токенах (працює в Server Components і у формах server actions без JS).
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
