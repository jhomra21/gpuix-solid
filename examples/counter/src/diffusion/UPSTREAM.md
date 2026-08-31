# Diffusion Studio editor source

The native Diffusion example is grounded in the actual open-source Diffusion Studio editor, not the older GPUIX mock timeline.

- Repository: `diffusionstudio/editor`
- Commit: `585fb010dcca36919f096f4b1275d535acab0cb9`
- License: MPL-2.0
- Application source: `apps/web/src/pages/editor.tsx`

## Preserved application ownership

The real editor is already a Solid application. Its `EditorPage` owns the visible surface as:

- `SidebarLeft`
- `Canvas`
- `Inspector`
- `Layers`
- `Timeline`
- `Soundboard`
- `FloatingProjectHeader` when the main UI is hidden

The native example keeps that same ownership and the editor's 264px left/right panel structure. Exact upstream source bytes for the page and the main visible component owners are vendored under `upstream/diffusion-editor/` and guarded by `source:check`.

## Native compatibility boundary

The browser editor depends on Koota, the Diffusion runtime/reconciler, project compilation/watch services, DOM drag-and-drop, Web/Engine canvas rendering, Web Audio nodes, and Tailwind/Kobalte UI primitives. Those runtime-specific concerns cannot execute unchanged through the GPUIX native renderer.

The native fixture therefore substitutes deterministic editor state and GPUIX-native surfaces beneath the same application/component boundary. It must not replace the Diffusion editor with a newly designed video editor or borrow the GPUIX mock `Diffusion Studio Pro` timeline as its source.

The older GPUIX timeline remains only as an internal renderer test/performance workload.
