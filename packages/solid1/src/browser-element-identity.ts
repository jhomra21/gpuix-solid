import "./dom-environment.js"
import { HostElementNode } from "./host/nodes.js"

type BrowserElementCandidate = HostElementNode | HTMLElement | null

function isBrowserElement(value: BrowserElementCandidate): boolean {
  return value instanceof HostElementNode
    || value === globalThis.document.body
    || value === globalThis.document.documentElement
}

function isSemanticElement(value: unknown, localName: string): boolean {
  return value instanceof HostElementNode && value.localName === localName
}

function browserElementConstructor(
  predicate: (value: unknown) => boolean,
): typeof HTMLElement {
  class BrowserElement {}

  Object.defineProperty(BrowserElement, Symbol.hasInstance, {
    configurable: false,
    value: predicate,
  })

  return BrowserElement as typeof HTMLElement
}

function installConstructor(name: string, constructor: typeof HTMLElement): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: constructor,
  })

  const browserWindow = globalThis.window as unknown as Record<string, unknown> | undefined
  if (browserWindow) {
    Object.defineProperty(browserWindow, name, {
      configurable: true,
      writable: true,
      value: constructor,
    })
  }
}

export function installBrowserElementIdentity(): void {
  const BrowserElement = browserElementConstructor(isBrowserElement)

  for (const name of ["Element", "HTMLElement"] as const) {
    installConstructor(name, BrowserElement)
  }

  const semanticConstructors = {
    HTMLCanvasElement: "canvas",
    HTMLImageElement: "img",
    HTMLInputElement: "input",
    HTMLTextAreaElement: "textarea",
  } as const

  for (const [name, localName] of Object.entries(semanticConstructors)) {
    installConstructor(
      name,
      browserElementConstructor((value) => isSemanticElement(value, localName)),
    )
  }
}
