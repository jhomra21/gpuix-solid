type CompatListener = ((event: Event) => void) | { handleEvent(event: Event): void }

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

type CompatDocument = CompatEventTarget & {
  body?: CompatEventTarget
}

const listeners = new WeakMap<object, Map<string, Set<CompatListener>>>()

export function installDomEventEnvironment(): void {
  const globals = globalThis as typeof globalThis & { document?: CompatDocument }
  const documentTarget = globals.document ?? {}
  const bodyTarget = documentTarget.body ?? {}

  installEventTarget(documentTarget)
  installEventTarget(bodyTarget)
  documentTarget.body = bodyTarget

  if (!globals.document) {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: documentTarget,
    })
  }
}

function installEventTarget(target: CompatEventTarget): void {
  const object = target as object
  if (!target.addEventListener) {
    target.addEventListener = (type, listener) => {
      if (!listener) return
      let byType = listeners.get(object)
      if (!byType) {
        byType = new Map()
        listeners.set(object, byType)
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
      listeners.get(object)?.get(type)?.delete(listener)
    }
  }
  if (!target.dispatchEvent) {
    target.dispatchEvent = (event) => {
      for (const listener of listeners.get(object)?.get(event.type) ?? []) {
        if (typeof listener === "function") listener(event)
        else listener.handleEvent(event)
      }
      return !event.defaultPrevented
    }
  }
}

installDomEventEnvironment()
