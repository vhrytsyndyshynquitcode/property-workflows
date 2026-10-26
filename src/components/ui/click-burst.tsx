"use client"

import * as React from "react"

// Спецефект на дії (ADR 0005): клік по кнопці чи посиланню — кільце й іскри в гамі Mochi-Puff. Лише прикраса:
// pointer-events: none, aria-hidden, нічого не перехоплює; при prefers-reduced-motion — вимкнено.

const ACTION_SELECTOR = 'a[href], button:not(:disabled), [role="button"], input[type="submit"]:not(:disabled), summary'
// Класи записано повністю, щоб Tailwind їх згенерував.
const SPARK_COLORS = ["bg-mochi-violet", "bg-mochi-pink", "bg-primary"] as const
const SPARKS = 10
const DURATION = 520

export function isActionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(ACTION_SELECTOR) !== null
}

function burst(x: number, y: number) {
  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  layer.className = "pointer-events-none fixed z-[60] size-0"
  layer.style.left = `${x}px`
  layer.style.top = `${y}px`

  const ring = document.createElement("span")
  ring.className = "absolute -top-2 -left-2 size-4 rounded-full border-2 border-mochi-violet"
  layer.appendChild(ring)
  ring.animate(
    [
      { transform: "scale(0.4)", opacity: 0.9 },
      { transform: "scale(3.4)", opacity: 0 },
    ],
    { duration: DURATION, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
  )

  for (let i = 0; i < SPARKS; i++) {
    const spark = document.createElement("span")
    spark.className = `absolute -top-1 -left-1 size-2 rounded-full ${SPARK_COLORS[i % SPARK_COLORS.length]}`
    layer.appendChild(spark)
    const angle = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4
    const distance = 26 + Math.random() * 22
    spark.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${(Math.cos(angle) * distance).toFixed(1)}px, ${(Math.sin(angle) * distance).toFixed(1)}px) scale(0.2)`,
          opacity: 0,
        },
      ],
      { duration: DURATION, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
    )
  }

  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), DURATION + 80)
}

function ClickBurst() {
  React.useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onPointerDown = (event: PointerEvent) => {
      if (motionQuery.matches || event.button !== 0 || !isActionTarget(event.target)) return
      burst(event.clientX, event.clientY)
    }
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true })
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true })
  }, [])

  return null
}

export { ClickBurst }
