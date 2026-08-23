import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import { createComponent } from "./host/universal.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import { universalRender } from "./host/universal.js"
import type { NativeRenderer } from "./host/types.js"
import { GpuixContext } from "./context.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"

export interface Root {
  render(code: () => unknown): void
  flush(): void
  flushSync<T>(fn: () => T): T
  dispatch(event: EventPayload): void
  unmount(): void
}

export function createRoot(renderer: NativeRenderer): Root {
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let dispose: (() => void) | undefined

  const flush = (): void => driver.flush()

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flush()
        events.clear()
      }
      type UniversalNode = HostRootNode | HostNode
      const Provider = GpuixContext.Provider as unknown as (props: {
        value: { renderer: NativeRenderer }
        readonly children: unknown
      }) => UniversalNode
      dispose = universalRender(
        () =>
          createComponent(Provider, {
            value: { renderer },
            get children() {
              return code()
            },
          }),
        container,
      )
      flush()
    },
    flush,
    flushSync(fn) {
      const value = fn()
      flush()
      return value
    },
    dispatch(event) {
      events.dispatch(event)
      flush()
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      flush()
      events.clear()
      driver.dispose()
    },
  }
}

export function createRenderer(
  onEvent?: (event: EventPayload) => void,
): { renderer: GpuixRenderer; bindRoot(root: Root): void } {
  let root: Root | undefined
  const renderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid] native event error", error)
      return
    }
    if (!event) return
    root?.dispatch(event)
    onEvent?.(event)
  })

  return {
    renderer,
    bindRoot(nextRoot) {
      root = nextRoot
    },
  }
}

export interface RenderOptions extends WindowOptions {
  renderer?: NativeRenderer
  onEvent?: (event: EventPayload) => void
}

export interface RenderHandle {
  root: Root
  loop: FrameLoop
  renderer: NativeRenderer
  unmount(): void
}

export function render(code: () => unknown, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, ...windowOptions } = options

  if (injected) {
    const root = createRoot(injected)
    root.render(code)
    return {
      root,
      renderer: injected,
      loop: { stop() {} },
      unmount() {
        root.unmount()
      },
    }
  }

  const native = createRenderer(onEvent)
  native.renderer.init(windowOptions)
  const root = createRoot(native.renderer)
  native.bindRoot(root)
  root.render(code)
  const loop = startFrameLoop(native.renderer, {
    onTerminated() {
      process.exitCode = 0
    },
  })

  return {
    root,
    renderer: native.renderer,
    loop,
    unmount() {
      loop.stop()
      root.unmount()
    },
  }
}
