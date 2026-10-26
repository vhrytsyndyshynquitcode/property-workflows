import { cn } from "cn"

// Нативний checkbox на токенах (працює у формах server actions без JS); фокус — ring.
function NativeCheckbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      data-slot="native-checkbox"
      className={cn(
        "size-4 rounded border-input accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

export { NativeCheckbox }
