class CompatHTMLCanvasElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    if (!Object.hasOwn(globalThis, "HTMLElement")) return false
    return value instanceof globalThis.HTMLElement && value.localName === "canvas"
  }
}

export function installCanvasElementIdentity(): void {
  if (Object.hasOwn(globalThis, "HTMLCanvasElement")) return
  Object.defineProperty(globalThis, "HTMLCanvasElement", {
    configurable: true,
    writable: true,
    value: CompatHTMLCanvasElement,
  })
}

installCanvasElementIdentity()
