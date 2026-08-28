import type { EventPayload } from "@gpuix/native"
import { flush as flushSolid, type Element as SolidElement } from "solid-js"
import { GpuixContext } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import {
  createHostElement,
  HostRootNode,
  insertHostNode,
  removeHostNode,
  setHostProperty,
  type HostNode,
} from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
import { createComponent, universalRender } from "./host/universal.js"

export interface Root {
  render(code: () => SolidElement): void
  flush(): void
  flushSync<T>(fn: () => T): T
  dispatch(event: EventPayload): void
  unmount(): void
}

export function createRoot(renderer: NativeRenderer): Root {
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)

  const shell = createHostElement("div")
  setHostProperty(shell, "style", {
    position: "relative",
    width: "100%",
    height: "100%",
  })
  insertHostNode(container, shell)

  const appContainer = createHostElement("div")
  setHostProperty(appContainer, "style", {
    width: "100%",
    height: "100%",
  })
  insertHostNode(shell, appContainer)

  const portalTarget = createHostElement("div")
  setHostProperty(portalTarget, "style", {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: "none",
  })
  insertHostNode(shell, portalTarget)
  container.portalTarget = portalTarget

  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()
  const flush = (): void => {
    flushSolid()
    flushNative()
  }
  const clearApp = (): void => {
    for (;;) {
      const mounted = appContainer.children[0]
      if (!mounted) return
      removeHostNode(appContainer, mounted)
    }
  }

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        clearApp()
        flush()
      }

      type UniversalNode = HostRootNode | HostNode
      type ContextProps = { value: { renderer: NativeRenderer }; readonly children: SolidElement }
      const Context = (props: ContextProps): UniversalNode => {
        // SAFETY: the Solid context provider returns the active renderer's host child.
        return GpuixContext(props) as UniversalNode
      }

      dispose = universalRender(
        () =>
          createComponent(Context, {
            value: { renderer },
            get children() {
              return code()
            },
          }),
        appContainer,
      )
      flush()
    },
    flush,
    flushSync(fn) {
      try {
        return flushSolid(fn)
      } finally {
        flushNative()
      }
    },
    dispatch(event) {
      try {
        flushSolid(() => events.dispatch(event))
      } finally {
        flushNative()
      }
    },
    unmount() {
      dispose?.()
      dispose = undefined
      clearApp()
      removeHostNode(container, shell)
      flush()
      events.clear()
      driver.dispose()
    },
  }
}
