type CompatListener = (event: Event) => void

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

type CompatDocument = CompatEventTarget & {
  body?: CompatEventTarget
}

type CompatWindow = {
  setTimeout?: (callback: () => void, delay?: number) => ReturnType<typeof setTimeout>
  clearTimeout?: (handle: ReturnType<typeof setTimeout>) => void
}

const listeners = new WeakMap<CompatEventTarget, Map<string, Set<CompatListener>>>()

export function installDomEventEnvironment(): void {
  // SAFETY: this module owns only the optional browser-compat `document` and `window` fields and validates each method before installing it.
  const globals = globalThis as typeof globalThis & { document?: CompatDocument; window?: CompatWindow }
  const documentTarget = globals.document ?? {}
  const bodyTarget = documentTarget.body ?? {}
  const windowTarget = globals.window ?? {}

  installEventTarget(documentTarget)
  installEventTarget(bodyTarget)
  documentTarget.body = bodyTarget

  if (!windowTarget.setTimeout) {
    windowTarget.setTimeout = (callback, delay) => globalThis.setTimeout(callback, delay)
  }
  if (!windowTarget.clearTimeout) {
    windowTarget.clearTimeout = (handle) => globalThis.clearTimeout(handle)
  }

  if (!globals.document) {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: documentTarget,
    })
  }
  if (!globals.window) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: windowTarget,
    })
  }
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
