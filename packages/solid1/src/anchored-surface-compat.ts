import { setHostProperty, type HostElementNode, type HostNode, type HostRootNode } from "./host/nodes.js"

const EFFECTIVELY_TRANSPARENT_SURFACE = "rgba(0, 0, 0, 0.001)"

/**
 * GPUIX anchored layers intentionally inject a dark opaque surface when their
 * own style has no fill. Browser popper positioners are transparent wrappers
 * whose child owns the visible background and border, so that fallback leaks
 * through rounded child corners in light mode. Give only otherwise-unfilled
 * anchored wrappers a nonzero-alpha surface that is visually transparent;
 * GPUIX then preserves the browser layering instead of applying its fallback.
 */
export function syncAnchoredSurfaceCompatibility(root: HostRootNode): void {
  for (const child of root.children) syncAnchoredNode(child)
}

function syncAnchoredNode(node: HostNode): void {
  if (node.kind === "text") return
  if (node.type === "anchored") ensureTransparentAnchoredSurface(node)
  for (const child of node.children) syncAnchoredNode(child)
}

function ensureTransparentAnchoredSurface(node: HostElementNode): void {
  if (node.style.backgroundColor !== undefined || node.style.background !== undefined) return
  setHostProperty(node, "style", {
    ...node.style,
    backgroundColor: EFFECTIVELY_TRANSPARENT_SURFACE,
  })
}
