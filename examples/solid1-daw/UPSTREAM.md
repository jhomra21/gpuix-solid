# DAW Browser Convex Solid 1 dogfood source

This native example ports a focused UI slice from `jhomra21/daw-browser-convex`.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `3fb6ae9a10b8317feb23e77832e0894da7420f9b`
- framework: Solid 1

## Fidelity contract

This fixture is not a generic DAW mock. Browser-only implementation details such as Tailwind class names, DOM APIs, SVG/canvas plumbing, Convex persistence and Web Audio are translated or replaced, but the native GPUIX version must preserve the current application's recognizable component hierarchy, geometry, tokens and interaction semantics.

The implementation is source-first, not screenshot-first. Start from the pinned Solid component and preserve its Solid control flow, component boundaries, ordering, dimensions, alignment and state semantics as directly as possible. Translate only browser host details that cannot execute in GPUIX (DOM/Kobalte primitives, Tailwind class strings, SVG/canvas/browser APIs, persistence/audio/router integrations). Do not redraw or reinterpret a component from a screenshot when its Solid source already expresses the UI. When equivalent source intent renders differently, treat that as a GPUIX/Solid compatibility defect to fix or explicitly document rather than compensating with arbitrary per-example offsets.

## Compatibility-first port sequence

Do not continue expanding the hand-translated DAW UI until the browser-facing primitive layers are independently validated. The sequence is:

1. `examples/solid1-kobalte`: validate native Solid 1 compatibility for the exact Kobalte surface used by the DAW — Button, Image/Avatar, Separator, TextField, Tooltip, Dialog, DropdownMenu, ContextMenu, Menubar and ColorMode.
2. Add native `class` / `classList` / Tailwind v4 compilation so the DAW's actual utility strings and theme tokens resolve to GPUIX styles instead of being manually rewritten.
3. Add native aliases for the Kobalte import paths so the DAW wrappers can keep their existing public API and CVA/cn output.
4. Replace the native DAW translations with the pinned Solid source components and deterministic fixture data.
5. Treat any remaining visual or interaction mismatch as a GPUIX compatibility defect, not an invitation to tune source-specific coordinates.

Pinned geometry from the source branch:

- left browser default width: 280px
- track sidebar minimum width: 336px
- arrangement overview: 24px
- timeline ruler: 32px
- normal track lane: 96px (`LANE_HEIGHT`)
- shared bottom/effects panel body: 360px (`FX_PANEL_HEIGHT_PX`)
- bottom panel footer: 28px
- bottom edge padding: 4px

The native color constants are sRGB translations of the dark OKLCH tokens in `src/index.css`, including timeline background/surfaces, borders, clips, meters, playhead and device graph colors.

## Source-structured component map

The old hand-built `DawSolid1Showcase` implementation was removed. `src/app.tsx` now only mounts a source-shaped native `Timeline` tree.

| Native fixture | Pinned upstream Solid 1 source | Preserved responsibility |
| --- | --- | --- |
| `src/native/Timeline.tsx` | `src/components/Timeline.tsx` | top-level Solid state/selection/transport/panel ownership and composition |
| `src/native/TimelineChrome.tsx` | `src/components/timeline/timeline-chrome.tsx` | visible transport chrome boundary |
| `src/native/TransportControls.tsx` | `src/components/timeline/TransportControls.tsx` | three-column desktop transport, 28px controls, BPM, loop/grid/MIDI/save/playhead |
| `src/native/TimelineWorkspace.tsx` | `src/components/timeline/timeline-workspace.tsx` | **TimelineLeftBrowser → timeline surface → TrackSidebar** ordering, overview/ruler/lanes |
| `src/native/TimelineLeftBrowser.tsx` | `src/components/timeline/browser/timeline-left-browser.tsx` | Assets/Effects/MIDI Instruments tabs, search, 24px tree rows |
| `src/native/TrackSidebar.tsx` | `src/components/timeline/TrackSidebar.tsx` | right-side track mixer/sidebar placement |
| `src/native/TrackSidebarRow.tsx` | `src/components/timeline/TrackSidebarRow.tsx` | three-column row, color rail, routing, activation/solo/record, volume/pan/send/meter |
| `src/native/TrackLane.tsx` | `src/components/timeline/TrackLane.tsx` | 96px arrangement lane and clip ownership |
| `src/native/ClipComponent.tsx` | `src/components/timeline/ClipComponent.tsx` | start/duration geometry, 20px title header, waveform/MIDI visual, selected border, drag hit target |
| `src/native/TimelinePanels.tsx` | `src/components/timeline/timeline-panels.tsx` | Effects/Clip panel ownership |
| `src/native/TimelineBottomPanelShell.tsx` | `src/components/timeline/TimelineBottomPanelShell.tsx` | 360px panel body and top resize affordance |
| `src/native/TimelineBottomPanelFooter.tsx` | `src/components/timeline/TimelineBottomPanelFooter.tsx` | **bottom-mounted** Effects/Clip footer and Hide/Show control |
| `src/native/EffectsPanel.tsx` | `src/components/timeline/EffectsPanel.tsx`, `src/components/effects/Compressor.tsx`, `src/components/effects/Eq.tsx` | horizontal device chain, 560px Compressor layout and EQ graph/control vocabulary |
| `src/native/theme.ts` | `src/index.css`, `src/lib/timeline-utils.ts`, bottom-panel layout constants | dark tokens and canonical geometry |

Notable desktop fidelity rule: upstream `TransportControls` only renders the web Menubar when `VITE_DESKTOP !== "true"`. The GPUIX native fixture therefore does **not** add a File/Edit/View/Settings/Tracks row inside the transport.

## Native interaction coverage

The live fixture uses real GPUIX mouse events for timeline manipulation:

- mouse down on a clip starts a drag session
- held movement is intended to update the clip live
- horizontal movement converts pixels to timeline seconds
- Grid mode quantizes against BPM and the selected denominator
- compatible audio clips can move between audio tracks
- incompatible MIDI-to-audio drops are rejected
- mouse up ends the local drag session

`@gpuix/native@0.4.0`'s macOS `TestGpuixRenderer` currently delivers the initial mouse-down but does not deliver the subsequent held move/up sequence required to automate the complete drag. This is tracked at `remorses/gpuix#20`. The integration test verifies entry into native drag state and automatically runs the full snapping/cross-track assertions if continuation events become available; it does not claim full synthetic drag coverage while that upstream limitation remains.

Physical-mouse drag behavior is part of the required manual macOS acceptance pass.

## Intentionally omitted application systems

The source application also contains collaboration, Convex, TanStack Router, Web Audio/native audio hosting, persistence, undo/history, automation, VST3, drag-created tracks, multi-clip drag, Ctrl-drag duplication and a much larger device catalog. Those systems are not copied into this renderer fixture. Deterministic local adapters replace them so the test isolates Solid 1 reconciliation and GPUI rendering while retaining the source application's UI structure and interaction language.

## Merge gate

This example is not complete merely because it builds or its automated tests pass. Before PR #47 can merge, the native window must be manually compared side-by-side on macOS with the pinned DAW branch and accepted as recognizably the same UI for the included slice. Material layout, hierarchy, typography, control or state-treatment differences remain defects.