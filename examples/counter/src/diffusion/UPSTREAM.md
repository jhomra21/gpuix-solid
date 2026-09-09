# Diffusion Studio editor source

The native Diffusion example is grounded in the actual open-source Diffusion Studio editor, not the older GPUIX mock timeline.

- Repository: `diffusionstudio/editor`
- Commit: `585fb010dcca36919f096f4b1275d535acab0cb9`
- License: MPL-2.0
- Application source: `apps/web/src/pages/editor.tsx`

The editor application sits on the repository's open-source `runtime`, `reconciler`, `koota-solid`, JSX, assets, and encoder packages. The native example does not recreate those engines; it keeps the editor-facing Solid UI shape and substitutes deterministic state below that boundary.

## Demo scope

This is intentionally a small editor demo, not a clone of every Diffusion Studio feature. It implements three representative source-owned slices end to end:

1. **Timeline and layers** — source timeline geometry/ruler/playhead behavior plus functional layer selection, rename, mute, solo, hide/show, reorder, remove, split, row height, time format, playback, looping, and add-layer behavior.
2. **Canvas tools** — the source toolbar shape with a real Move/Hand menu, Frame, Rectangle, Text, and AI prompt toggle. The selected tool is real demo state; browser/ECS scene insertion remains below the compatibility boundary.
3. **Minimal AI prompt** — a source-shaped Image/Video prompt with real mode, model, aspect-ratio, variant, duration, and audio state. The exposed defaults and constraints come from `apps/web/src/components/genai/config.ts` at Git blob `c9092c4332a5f37ca83879d8f79cdb5d0c8c1c7f`. Image and Video are the deliberate demo subset; Voice, Audio, media-reference picking, drag/drop, and remote generation are not shown rather than being represented by inert controls.

Every visible control in those three slices must work. Unsupported upstream features should be omitted, not drawn as decorative placeholders.

## Preserved application ownership

The real editor is already a Solid application. Its `EditorPage` composes:

- `SidebarLeft`
- `Canvas`
- `Inspector`
- `Layers`
- `Timeline`
- `Soundboard`
- `FloatingProjectHeader` when the main UI is hidden

The native example keeps that ownership and the editor's 264px left/right panel structure. Exact upstream source bytes for the page and the principal visible component owners are vendored under `upstream/diffusion-editor/` and guarded by `source:check`.

The layer contract now pins the exact upstream `Layers`, `Layer`, and `NodeLayer` sources. The timeline contract also pins the real renderer configuration, colors, ruler, waveform, and playhead implementations. Native geometry and labels should derive from those owners rather than from a separately designed editor.

## Native compatibility boundary

The browser editor depends on Koota, the Diffusion runtime/reconciler, project compilation/watch services, DOM drag-and-drop, Web/Engine canvas rendering, Web Audio nodes, generation services, and Tailwind/Kobalte UI primitives. Those runtime-specific concerns cannot execute unchanged through the GPUIX native renderer.

The native fixture therefore substitutes deterministic editor state and GPUIX-native surfaces beneath the same application/component boundary. It must not replace the Diffusion editor with a newly designed video editor or borrow the GPUIX mock `Diffusion Studio Pro` timeline as its source.

For canvas-backed systems such as the timeline, the compatibility layer ports the real editor's renderer rules: source constants, ruler interval selection, clip geometry, source colors, and playhead behavior. For the AI demo, generation itself is deterministic local state; the visible prompt configuration remains source-shaped and functional.

The older GPUIX timeline remains only as an internal renderer test/performance workload.
