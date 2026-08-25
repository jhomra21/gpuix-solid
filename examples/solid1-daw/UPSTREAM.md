# DAW Browser Convex Solid 1 dogfood source

This native example ports a focused UI slice from `jhomra21/daw-browser-convex`.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `3fb6ae9a10b8317feb23e77832e0894da7420f9b`
- framework: Solid 1

## Fidelity contract

This fixture is not a generic DAW mock. Browser-only implementation details such as Tailwind class names, DOM APIs, SVG plumbing, Convex persistence and Web Audio are translated or replaced, but the native GPUIX version should preserve the current application's recognizable geometry, hierarchy, tokens and interaction semantics.

Pinned geometry from the source branch:

- left browser default width: 280px (`TIMELINE_LEFT_BROWSER_DEFAULT_WIDTH`)
- track sidebar minimum width: 336px (`TIMELINE_SIDEBAR_MIN_WIDTH`)
- arrangement overview: 24px
- timeline ruler: 32px
- normal track lane: 96px (`LANE_HEIGHT`)
- shared bottom/effects panel: 360px (`FX_PANEL_HEIGHT_PX`)

The native color constants are sRGB translations of the dark OKLCH tokens in `src/index.css`, including timeline background/surfaces, borders, clips, meters, playhead and device graph colors.

## Upstream surfaces represented

- `src/components/Timeline.tsx` and `src/components/timeline/timeline-workspace.tsx` — timeline composition
- `src/components/timeline/TransportControls.tsx` — three-column transport, record/play/pause/stop, BPM, metronome, loop, grid and resolution
- `src/components/timeline/browser/timeline-left-browser.tsx` — Assets / Effects / MIDI Instruments tabs, search and tree rows
- `src/components/timeline/TrackSidebar.tsx` / `TrackSidebarRow.tsx` — current track geometry, selection, color rails, mute/solo/record arm, meters and mixer treatment
- `src/components/timeline/TimelineBottomPanelShell.tsx` — shared 360px bottom panel and resize affordance
- `src/components/timeline/EffectsPanel.tsx` — selected-track device chain
- `src/components/effects/EffectShell.tsx` — device shell/header/enable treatment
- `src/components/effects/Compressor.tsx` — compressor layout, graph/status/knob vocabulary
- `src/hooks/useClipDrag.ts` and timeline drag-placement helpers — pointer-driven clip movement and grid snapping behavior
- `src/lib/timeline-utils.ts` — timeline geometry and snapping constants
- `src/index.css` — current dark application/timeline/device tokens

## Native interaction coverage

The fixture intentionally uses real GPUIX mouse events rather than click-only substitutes for timeline movement:

- mouse down on a clip starts a drag session
- pressed mouse movement updates the clip live
- horizontal movement converts pixels to timeline seconds
- Grid mode quantizes against BPM and the selected denominator
- compatible audio clips can move between audio tracks
- incompatible MIDI-to-audio drops are rejected
- mouse up commits the local demo position

The native macOS integration test simulates the complete mouse-down → pressed mouse-move → mouse-up path and asserts both horizontal snapped movement and compatible cross-track movement.

## Intentionally omitted application systems

The source application also contains collaboration, Convex, TanStack Router, Web Audio/native audio hosting, persistence, undo/history, automation, VST3, drag-created tracks, multi-clip drag, Ctrl-drag duplication and a much larger device catalog. Those systems are not copied into this renderer fixture. Deterministic local state replaces them so the test isolates Solid 1 reconciliation, native pointer behavior and GPUI rendering while retaining the source application's UI language.
