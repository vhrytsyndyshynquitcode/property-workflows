"use client"

import * as React from "react"
import { cn } from "cn"

// Талісман Mochi-Puff (ADR 0004): пухнаста 3D-істота на WebGL, що стежить очима за курсором. three.js
// вантажиться ліниво — лише на сторінках із талісманом. Декоративний: aria-hidden, без тексту й дій.
// Без WebGL полотно просто лишається порожнім.

// hero — великий талісман сторінки (вхід, 404): поки він на екрані, кутовий MochiCorner ховається.
function MochiPuff({ className, hero = false }: { className?: string; hero?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = ref.current
    if (!container) return
    let dispose: (() => void) | undefined
    let cancelled = false
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    // Монтуємо сцену з актуальним налаштуванням руху; при його зміні — перемонтовуємо.
    function mount() {
      import("./mochi/scene")
        .then(({ mountMochi }) => {
          if (cancelled || !container) return
          dispose?.()
          dispose = mountMochi(container, { reducedMotion: motionQuery.matches })
        })
        .catch(() => {
          // WebGL недоступний або модуль не завантажився — прикраса просто не показується.
        })
    }
    mount()
    motionQuery.addEventListener("change", mount)

    return () => {
      cancelled = true
      motionQuery.removeEventListener("change", mount)
      dispose?.()
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mascot-hero={hero ? "" : undefined}
      className={cn("aspect-square w-full", className)}
    />
  )
}

// Кутовий талісман робочих екранів: у root layout, тож не перестворюється при переходах між сторінками.
// Ховається, коли на сторінці є великий талісман (вхід, 404), і на вузьких екранах, де перекривав би кнопки.
function MochiCorner() {
  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-20 hidden w-32 sm:block lg:w-36 [body:has([data-mascot-hero])_&]:hidden">
      <MochiPuff className="pointer-events-auto" />
    </div>
  )
}

export { MochiCorner, MochiPuff }
