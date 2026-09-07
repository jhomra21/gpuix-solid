class CompatHTMLCanvasElement {
  static [Symbol.hasInstance](value: unknown): boolean {
    const HTMLElementConstructor = globalThis.HTMLElement
    if (typeof HTMLElementConstructor !== "function" || !(value instanceof HTMLElementConstructor)) return false
    return value.localName === "canvas"
  }
}

export function installCanvasElementIdentity(): void {
  if (typeof globalThis.HTMLCanvasElement !== "undefined") return
  Object.defineProperty(globalThis, "HTMLCanvasElement", {
    configurable: true,
    writable: true,
    value: CompatHTMLCanvasElement,
  })
}

installCanvasElementIdentity()
