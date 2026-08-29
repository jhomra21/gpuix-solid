import "./dom-environment.js"
import { HostElementNode } from "./host/nodes.js"

type BrowserElementCandidate = HostElementNode | HTMLElement | null

function isBrowserElement(value: BrowserElementCandidate): boolean {
  return value instanceof HostElementNode
    || value === globalThis.document.body
    || value === globalThis.document.documentElement
}

export function installBrowserElementIdentity(): void {
  class BrowserElement {}

  Object.defineProperty(BrowserElement, Symbol.hasInstance, {
    configurable: false,
    value: isBrowserElement,
  })

  for (const name of ["Element", "HTMLElement"] as const) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: BrowserElement,
    })
  }
}
