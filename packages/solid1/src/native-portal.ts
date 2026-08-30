import { onCleanup, type JSX } from "solid-js"
import { useGpuixContextRequired, type ViewportSize } from "./context.js"
import {
  createHostElement,
  insertHostNode,
  removeHostNode,
  setHostProperty,
  type HostElementNode,
  type HostRootNode,
} from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
import { insert } from "./universal.js"

interface NativePortalRoot {
  container: HostRootNode
  getViewportSize: () => ViewportSize
}

const portalRoots = new WeakMap<NativeRenderer, NativePortalRoot>()

export function registerNativePortalRoot(
  renderer: NativeRenderer,
  container: HostRootNode,
  getViewportSize: () => ViewportSize,
): void {
  portalRoots.set(renderer, { container, getViewportSize })
}

export function unregisterNativePortalRoot(renderer: NativeRenderer): void {
  portalRoots.delete(renderer)
}

/**
 * Solid's browser Portal moves its children to a document-level layer. GPUIX
 * native roots allow one top-level element, so mount each portal as an
 * absolutely positioned sibling inside that top-level element instead. The
 * layer itself spans the native viewport, making fixed overlays and nested
 * poppers use window coordinates without changing the application's layout.
 * The wrapper has no hitbox so clicks outside its interactive descendants fall
 * through to the underlying application, matching a browser portal container.
 */
export function Portal(props: { children: JSX.Element }): JSX.Element {
  const { renderer } = useGpuixContextRequired()
  const layer = createNativePortalLayer(renderer)
  insert(layer, () => props.children)

  onCleanup(() => {
    const parent = layer.parent
    if (parent) removeHostNode(parent, layer)
  })

  return undefined
}

function createNativePortalLayer(renderer: NativeRenderer): HostElementNode {
  const state = portalRoots.get(renderer)
  if (!state) throw new Error("Solid 1 Portal requires a registered GPUIX root")

  const mounted = state.container.children[0]
  if (!mounted || mounted.kind !== "element") {
    throw new Error("Solid 1 Portal requires an element root mounted before portal content")
  }

  const viewport = state.getViewportSize()
  const layer = createHostElement("div")
  setHostProperty(layer, "style", {
    position: "absolute",
    top: 0,
    left: 0,
    width: viewport.width,
    height: viewport.height,
    pointerEvents: "none",
  })
  insertHostNode(mounted, layer)
  return layer
}
