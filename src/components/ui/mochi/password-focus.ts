// Сором'язливий режим талісмана (ADR 0004): стежить, чи фокус у полі пароля. Окремо від сцени, щоб тестувати без WebGL.

type FocusSource = Pick<Document, "activeElement" | "addEventListener" | "removeEventListener">

export function isPasswordField(element: Element | null): boolean {
  return element?.tagName === "INPUT" && (element as HTMLInputElement).type === "password"
}

/** Викликає onChange(true/false) щоразу, коли фокус входить у поле пароля або виходить з нього; повертає відписку. */
export function watchPasswordFocus(doc: FocusSource, onChange: (typingPassword: boolean) => void): () => void {
  // Під час focusout activeElement ще старий — читаємо його після події.
  let timer: ReturnType<typeof setTimeout> | undefined
  const sync = () => onChange(isPasswordField(doc.activeElement))
  const onFocusChange = () => {
    clearTimeout(timer)
    timer = setTimeout(sync, 0)
  }
  doc.addEventListener("focusin", onFocusChange)
  doc.addEventListener("focusout", onFocusChange)
  sync() // поле пароля могло отримати фокус до монтування сцени
  return () => {
    clearTimeout(timer)
    doc.removeEventListener("focusin", onFocusChange)
    doc.removeEventListener("focusout", onFocusChange)
  }
}
