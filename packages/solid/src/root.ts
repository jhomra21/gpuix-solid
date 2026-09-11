import type { EventPayload } from "@gpuix/native"
import { flush as flushSolid, type Element as SolidElement } from "solid-js"
import { GpuixContext, type GpuixContextValue } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import { BrowserPointerMutationDriver } from "./host/pointer-lifecycle.js"
import type { NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createComponent, universalRender } from "./host/universal.js"

const windowKeyEventIds = new WeakMap<NativeRenderer, number>()

function nextWindowKeyEventId(renderer: NativeRenderer): number {
  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1
  windowKeyEventIds.set(renderer, id)
  return id
}

function hasLiveElement(container: HostRootNode, elementId: number): boolean {
  const pending: HostNode[] = [...container.children]
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) continue
    if (node.kind === "element" && node.id === elementId && node.nativeAlive) return true
    pending.push(...node.children)
  }
  return false
}

export interface Root {
  render(code: () => SolidElement): void
  flush(): void
  flushSync<T>(fn: () => T): T
  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void
  dispatch(event: EventPayload): boolean
  unmount(): void
}

export function createRoot(renderer: NativeRenderer, initialWindowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {
  const events = new EventRegistry()
  const driver = new BrowserPointerMutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let windowKeyEventHandlers = initialWindowKeyEventHandlers
  let windowKeyEventId = nextWindowKeyEventId(renderer)
  let dispose: (() => void) | undefined

  const syncWindowKeyEvents = (): void => {
    renderer.setWindowKeyEvents?.(
      Boolean(windowKeyEventHandlers.onKeyDown),
      Boolean(windowKeyEventHandlers.onKeyUp),
      windowKeyEventId,
    )
  }
  syncWindowKeyEvents()

  const flushNative = (): void => driver.flush()
  const flush = (): void => {
    flushSolid()
    flushNative()
  }
  const flushSync = <T,>(fn: () => T): T => {
    try {
      return flushSolid(fn)
    } finally {
      flushNative()
    }
  }
  const contextValue: GpuixContextValue = { renderer, flushSync }

  return {
    render(code) {
      if (dispose) {
        // A remount owns a new renderer-level keyboard event id. Queued events
        // from the replaced tree therefore cannot enter the replacement root.
        windowKeyEventId = nextWindowKeyEventId(renderer)
        syncWindowKeyEvents()
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flush()
        events.clear()
      }

      type UniversalNode = HostRootNode | HostNode
      type ContextProps = { value: GpuixContextValue; readonly children: SolidElement }
      const Context = (props: ContextProps): UniversalNode => {
        // SAFETY: the Solid context provider returns the active renderer's host child.
        return GpuixContext(props) as UniversalNode
      }

      dispose = universalRender(
        () =>
          createComponent(Context, {
            value: contextValue,
            get children() {
              return code()
            },
          }),
        container,
      )
      flush()
    },
    flush,
    flushSync,
    setWindowKeyEventHandlers(handlers) {
      windowKeyEventHandlers = handlers
      syncWindowKeyEvents()
    },
    dispatch(event) {
      let handled = false
      try {
        flushSolid(() => {
          if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {
            if (event.elementId !== windowKeyEventId) return
            const handler = event.eventType === "windowKeyDown"
              ? windowKeyEventHandlers.onKeyDown
              : windowKeyEventHandlers.onKeyUp
            if (!handler) return
            handler(event, renderer)
            handled = true
            return
          }
          if (!hasLiveElement(container, event.elementId)) return
          events.dispatch(event)
          handled = true
        })
      } finally {
        flushNative()
      }
      return handled
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      flush()
      events.clear()
      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {
        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)
      }
      driver.dispose()
    },
  }
}
