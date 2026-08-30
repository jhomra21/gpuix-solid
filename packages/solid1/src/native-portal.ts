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
import type { NativeRenderer, StyleDesc } from "./host/types.js"
import { insert } from "./universal.js"

interface NativePortalRoot {
  container: HostRootNode
  getViewportSize: () => ViewportSize
}

const portalRoots = new WeakMap<NativeRenderer, NativePortalRoot>()
const portalLayers = new Set<HostElementNode>()

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
 * Browser portal examples often use a transparent fixed positioning wrapper
 * above a painted backdrop. That wrapper participates in layout but should not
 * hide the backdrop from native pointer targeting. Restrict this adjustment to
 * direct children of GPUIX portal layers so ordinary absolute app elements keep
 * their native hit-testing behavior.
 */
export function syncNativePortalHitTestingCompatibility(root: HostRootNode): void {
  for (const layer of portalLayers) {
    if (layer.root !== root || !layer.nativeAlive) continue
    for (const child of layer.children) {
      if (child.kind !== "element" || child.type !== "div") continue
      if (!isTransparentViewportPositioner(child.style) || child.events.size > 0) continue
      setHostProperty(child, "style", { ...child.style, pointerEvents: "none" })
    }
  }
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
  portalLayers.add(layer)
  insert(layer, () => props.children)

  onCleanup(() => {
    portalLayers.delete(layer)
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

function isTransparentViewportPositioner(style: StyleDesc): boolean {
  return style.pointerEvents === undefined
    && style.position === "absolute"
    && style.top === 0
    && style.right === 0
    && style.bottom === 0
    && style.left === 0
    && style.background === undefined
    && style.backgroundColor === undefined
}
