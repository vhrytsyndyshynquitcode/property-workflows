"use client"

import * as React from "react"
import { cn } from "cn"

// Талісман Mochi-Puff (ADR 0004): пухнаста 3D-істота на WebGL, що стежить очима за курсором. three.js
// вантажиться ліниво — лише на сторінках із талісманом. Декоративний: aria-hidden, без тексту й дій.
// Без WebGL полотно просто лишається порожнім.

function MochiPuff({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = ref.current
    if (!container) return
    let dispose: (() => void) | undefined
    let cancelled = false
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    import("./mochi/scene")
      .then(({ mountMochi }) => {
        if (!cancelled) dispose = mountMochi(container, { reducedMotion })
      })
      .catch(() => {
        // WebGL недоступний або модуль не завантажився — прикраса просто не показується.
      })

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  return <div ref={ref} aria-hidden="true" className={cn("aspect-square w-full", className)} />
}

export { MochiPuff }
