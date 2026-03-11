"use client"

export function blurActiveLayerTrigger() {
  if (typeof document === "undefined") return

  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return
  if (activeElement === document.body) return

  activeElement.blur()
}
