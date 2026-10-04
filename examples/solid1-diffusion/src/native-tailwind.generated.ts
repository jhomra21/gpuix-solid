import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"

// Explicit native omissions from the pinned Diffusion source.
// - z-5: published native StyleDesc has no z-index; retained-tree order places DrawOverlay after EngineCanvas
export const nativeTailwindManifest: NativeStyleManifest = {
  "classes": {
    "absolute": { "base": { "position": "absolute" } },
    "cursor-crosshair": { "base": { "cursor": "crosshair" } },
    "inset-0": { "base": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
    "pointer-events-none": { "base": { "pointerEvents": "none" } },
    "relative": { "base": { "position": "relative" } },
    "size-full": { "base": { "width": "100%", "height": "100%" } },
    "z-5": { "base": {} }
  }
}
