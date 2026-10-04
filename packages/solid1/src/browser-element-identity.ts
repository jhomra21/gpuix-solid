import "./dom-environment.js"
import { HostElementNode } from "./host/nodes.js"

class BrowserElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    return value instanceof HostElementNode
      || value === globalThis.document.body
      || value === globalThis.document.documentElement
  }
}

class BrowserCanvasElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    return value instanceof HostElementNode && value.localName === "canvas"
  }
}

class BrowserImageElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    return value instanceof HostElementNode && value.localName === "img"
  }
}

class BrowserInputElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    return value instanceof HostElementNode && value.localName === "input"
  }
}

class BrowserTextAreaElement {
  static [Symbol.hasInstance](value: HTMLElement): boolean {
    return value instanceof HostElementNode && value.localName === "textarea"
  }
}

export function installBrowserElementIdentity(): void {
  const constructors = [
    ["Element", BrowserElement],
    ["HTMLElement", BrowserElement],
    ["HTMLCanvasElement", BrowserCanvasElement],
    ["HTMLImageElement", BrowserImageElement],
    ["HTMLInputElement", BrowserInputElement],
    ["HTMLTextAreaElement", BrowserTextAreaElement],
  ] as const

  for (const [name, constructor] of constructors) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: constructor,
    })
    Object.defineProperty(globalThis.window, name, {
      configurable: true,
      writable: true,
      value: constructor,
    })
  }
}
