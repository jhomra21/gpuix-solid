import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"

export function applyDebugFrameOverlay(
  renderer: NativeRenderer,
  mode: DebugFrameOverlayMode | undefined,
): void {
  if (mode) renderer.setDebugFrameOverlay?.(mode)
}
