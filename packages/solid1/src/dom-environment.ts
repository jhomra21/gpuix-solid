type CompatListener = (event: Event) => void

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

type CompatDocument = CompatEventTarget & {
  body?: CompatEventTarget
}

type CompatImage = {
  onload: (() => void) | null
  onerror: (() => void) | null
  src: string
}

type CompatImageConstructor = new () => CompatImage

type CompatWindow = CompatEventTarget & {
  setTimeout?: (callback: () => void, delay?: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout?: (handle: ReturnType<typeof globalThis.setTimeout>) => void
  Image?: CompatImageConstructor
}

type CompatComputedStyle = {
  animationName: string
  animationDuration: string
  transitionDuration: string
  transitionProperty: string
  display: string
}

type CompatGlobalEnvironment = {
  document?: CompatDocument
  window?: CompatWindow
  getComputedStyle?: () => CompatComputedStyle
}

const listeners = new WeakMap<CompatEventTarget, Map<string, Set<CompatListener>>>()

export function installDomEventEnvironment(): void {
  // SAFETY: this module reads and installs only the optional browser-compat fields declared by CompatGlobalEnvironment.
  const globals = globalThis as CompatGlobalEnvironment
  const documentTarget = globals.document ?? {}
  const bodyTarget = documentTarget.body ?? {}
  const currentWindow = globals.window
  const windowTarget: CompatWindow = currentWindow ?? {}

  installEventTarget(documentTarget)
  installEventTarget(bodyTarget)
  installEventTarget(windowTarget)
  documentTarget.body = bodyTarget

  if (!windowTarget.setTimeout) {
    windowTarget.setTimeout = (callback, delay) => globalThis.setTimeout(callback, delay)
  }
  if (!windowTarget.clearTimeout) {
    windowTarget.clearTimeout = (handle) => globalThis.clearTimeout(handle)
  }
  if (!windowTarget.Image) {
    windowTarget.Image = CompatImageLoader
  }

  if (!globals.document) {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: documentTarget,
    })
  }
  if (!currentWindow) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: windowTarget,
    })
  }
  if (!globals.getComputedStyle) {
    Object.defineProperty(globalThis, "getComputedStyle", {
      configurable: true,
      writable: true,
      value: () => ({
        animationName: "none",
        animationDuration: "0s",
        transitionDuration: "0s",
        transitionProperty: "none",
        display: "block",
      }),
    })
  }
}

class CompatImageLoader implements CompatImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  #src = ""

  get src(): string {
    return this.#src
  }

  set src(value: string) {
    this.#src = value
    queueMicrotask(() => {
      if (supportsNativeImageSource(value)) this.onload?.()
      else this.onerror?.()
    })
  }
}

function supportsNativeImageSource(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("file:")
}

function installEventTarget(target: CompatEventTarget): void {
  if (!target.addEventListener) {
    target.addEventListener = (type, listener) => {
      if (!listener) return
      let byType = listeners.get(target)
      if (!byType) {
        byType = new Map()
        listeners.set(target, byType)
      }
      let entries = byType.get(type)
      if (!entries) {
        entries = new Set()
        byType.set(type, entries)
      }
      entries.add(listener)
    }
  }
  if (!target.removeEventListener) {
    target.removeEventListener = (type, listener) => {
      if (!listener) return
      listeners.get(target)?.get(type)?.delete(listener)
    }
  }
  if (!target.dispatchEvent) {
    target.dispatchEvent = (event) => {
      for (const listener of listeners.get(target)?.get(event.type) ?? []) listener(event)
      return !event.defaultPrevented
    }
  }
}

installDomEventEnvironment()
