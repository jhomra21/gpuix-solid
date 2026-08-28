type CompatListener = (event: Event) => void

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

type CompatDocument = CompatEventTarget & {
  body?: CompatEventTarget
}

type CompatWindow = CompatEventTarget & {
  setTimeout?: (callback: () => void, delay?: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout?: (handle: ReturnType<typeof globalThis.setTimeout>) => void
}

type CompatGlobalEnvironment = {
  document?: CompatDocument
  window?: CompatWindow
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
