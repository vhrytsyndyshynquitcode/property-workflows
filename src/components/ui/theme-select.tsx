"use client"

import * as React from "react"
import { cn } from "cn"
import {
  parseThemeChoice,
  resolveTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/theme"
import { NativeSelect } from "./native-select"

// Вибір «Theme» (AC-DSYS-05, AC-DSYS-06): System / Light / Dark, зберігається на пристрої. Значення читаємо з
// localStorage через useSyncExternalStore: на сервері — «System», на клієнті — вибір пристрою, синхронно між вкладками.
const CHANGE_EVENT = "theme-choice-change"

function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return "system"
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function ThemeSelect({ className }: { className?: string }) {
  const id = React.useId()
  const choice = React.useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice)

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => document.documentElement.setAttribute("data-theme", resolveTheme(choice, media.matches))
    apply()
    if (choice !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [choice])

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, parseThemeChoice(event.target.value))
    } catch {
      // Приватний режим без сховища: вибір не збережеться.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <label htmlFor={id} className="text-muted-foreground">
        Theme
      </label>
      <NativeSelect id={id} value={choice} onChange={onChange}>
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

export { ThemeSelect }
