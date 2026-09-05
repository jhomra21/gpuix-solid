# DAW Browser Convex Solid 1 dogfood source

This native example exercises a focused UI slice from `jhomra21/daw-browser-convex` against the Solid 1 GPUIX host.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `2eaad47813b15aa8511bab8dc04625510c977b12`
- framework: Solid 1
- GPUIX native range: `^0.7.0` (the checked-in Bun lock resolves `0.7.0`)

## Fidelity contract

This fixture is source-first, not screenshot-first. Browser-facing source is copied byte-for-byte whenever GPUIX can host it. Compatibility belongs below copied source—in the Solid host, generated style bridge, or narrow service/type adapters—not in edited replicas of the upstream component.

Deterministic local data replaces Convex, collaboration, persistence, audio-engine and plugin backends. It must not replace visible source behavior. Controls included in the fixture remain interactive and keep their state at the fixture boundary.

`bun run source:check` hashes the copied files as Git blobs and rejects drift from the pinned revision. The current closure contains **75 exact upstream files**.

## GPUIX version policy

The repository targets the latest reviewed GPUIX release line, `@gpuix/native ^0.7.0`, rather than floating to an unreleased upstream commit. The root lock resolves `0.7.0` reproducibly. Moving to a later GPUIX minor requires an explicit dependency/lock update and the full Linux, macOS, Windows, package-smoke, Solid 1 and native-fidelity suite.

The Solid 1 and Solid 2 hosts both carry the GPUIX 0.7 contracts used by this fixture, including the published test-renderer availability guard, `WindowOptions` passthrough, raw window key handling, native lifecycle termination, and two-stop linear-gradient support.

## Source that now runs directly

The parity script is the authoritative file list. Important visible source now running through GPUIX includes:

- `TransportControls`
- `TimelineLeftBrowser`
- `TimelineRuler`
- `ArrangementOverview`
- `TrackLane` and its source `ClipComponent`
- `TrackSidebar` / source sidebar rows through a fixture model adapter
- `TimelineBottomPanelShell` and footer
- `AutomationLane`
- `SampleDetailPanel`, `SampleClipPanel`, and `SampleDetailWaveform`
- `Compressor`, its `EffectShell`, controls and SVG graph
- `EqFilterTypeSelect`
- the copied DAW UI primitives and timeline/layout helpers used by those components
- the exact `clip-color.ts` helper, including its selected/ghost `color-mix(in srgb, …, transparent)` output

`src/native/ArrangementOverview.tsx` is now only a re-export of the exact copied overview. The old retained-div recreation is gone.

The native Tailwind generator scans copied source directly and fails closed on unaccounted classes. It is rebuilt before DAW build, test and typecheck instead of maintaining a parallel handwritten class map.

## Fixture adapters

Adapters own deterministic application state and missing services; they do not redefine source UI that can run unchanged.

| Adapter | Role |
| --- | --- |
| `src/native/Timeline.tsx` | deterministic project, transport, selection, record-arm, bottom-panel and routing state |
| `src/native/TimelineChrome.tsx` | composes exact transport source while omitting browser-only hidden inputs |
| `src/native/TransportControls.tsx` | deterministic project/menu/MIDI service boundary for exact transport UI |
| `src/native/TimelineLeftBrowser.tsx` | maps fixture browser data/preferences into the exact browser model |
| `src/native/TimelineWorkspace.tsx` | viewport/sidebar composition around exact ruler, overview and lane source |
| `src/native/SourceTrackSidebar.tsx` | maps fixture tracks, routing and automation state into exact `TrackSidebar` models |
| `src/native/TrackLane.tsx` | maps fixture clips/tracks and deterministic automation envelopes into exact `TrackLane` |
| `src/native/TimelineBottomPanelShell.tsx` | retained positioning wrapper around the exact shell; preview/commit resize state is forwarded to the fixture |
| `src/native/TimelinePanels.tsx` | switches exact Sample Detail against the effects chain and supplies deterministic audio/BPM services |
| `src/native/EffectsPanel.tsx` | mounts exact Compressor and the remaining explicit EQ compatibility surface |

Record arm is singular at the fixture application boundary: arming one track disarms the previous track rather than preserving independent legacy booleans as simultaneous armed state.

## Remaining native/browser capability boundaries

These are limitations of the current GPUIX/browser contract, not permission to invent alternate source UI.

### Canvas 2D

GPUIX hosts `<canvas>` as a retained element but does not expose the browser `CanvasRenderingContext2D` API used by the DAW waveform code.

Exact `ClipComponent` and exact `SampleDetailWaveform` remain mounted. Their non-canvas DOM, geometry, controls, beat-grid/marker structure and interaction semantics stay source-owned. Canvas drawing is intentionally no-draw when a 2D context is unavailable; the fixture must not replace it with a fake hand-drawn waveform.

### EQ Eight

The pinned EQ surface still depends on browser capabilities that do not map faithfully to GPUIX 0.7: Canvas 2D, `ResizeObserver`-driven graph sizing, animation-frame drawing, Web Audio filter-response APIs, and child grid placement/span semantics used by the source layout.

`src/native/EffectsPanel.tsx` therefore keeps the EQ device surface as the remaining visible compatibility leaf. Its state is deterministic and interactive, and its filter-type picker is the exact pinned `EqFilterTypeSelect`. This boundary should shrink or disappear when the required generic host capabilities exist; copied EQ source must not be edited to work around them.

## Host compatibility proved by this port

The DAW source exposed generic gaps that were fixed in the host instead of being hidden in local replicas. Solid 1 and Solid 2 stay aligned where their framework contracts overlap.

Notable coverage includes:

- production/test element bounds and browser-shaped `getBoundingClientRect()`
- native focus, blur, selection, scroll offsets and pointer-capture bookkeeping
- event target/currentTarget ownership and controlled input value synchronization
- browser-compatible `Element` / `HTMLElement` identity where source checks it
- global pointer forwarding used by unchanged timeline/ruler source
- minimal `document.body.classList` drag-state compatibility
- inline grid parsing needed by copied source
- semantic hidden/data-attribute style handling
- SVG event/paint compatibility used by copied components
- native range elements with intrinsic control geometry rather than text-editor backing
- transparent Tailwind OKLCH color mixing and exact upstream sRGB `color-mix(..., transparent)` normalization into native sRGB alpha
- source pointer transparency/ownership semantics so decorative descendants do not steal hits
- local Solid 1 host rebuilds before standalone example bundling, preventing stale ignored `dist` output from masking source changes

These are host features. DAW code should not grow local versions of them.

## Native acceptance coverage

The automated native fixture exercises the included source slice across the normal CI matrix, including:

- transport and BPM state
- browser tabs, tree and search
- track selection, collapse, routing/sends, mute/solo, singular record arm, volume and automation controls
- exact overview, ruler and lane composition
- playhead/loop interaction
- source clip selection/open behavior and exact selected clip paint
- source clip colors and native alpha conversion
- Effects / Clip bottom-panel switching, hide/show and resize state
- exact Compressor control/reset/collapse semantics
- EQ compatibility controls and exact source filter-type menu
- exact Sample Detail controls with deterministic BPM/stretch services
- package build/smoke and release-tool regression checks

The macOS CI path also uploads the native DAW screenshot used for visual review. A green automated run does not waive a material visual mismatch found in manual side-by-side comparison.

## Intentionally omitted systems

The complete source application contains collaboration, Convex, TanStack Router, persistence/history, real audio rendering, VST3 hosting, the full device catalog and broader editing workflows. Those systems are outside this renderer fixture. Deterministic service adapters replace them only where needed to keep the included source UI executable.

Some exact `TrackLane` callbacks for editing operations outside the focused fixture—such as full resize planning, duplicate/delete services, missing-media recovery and fade commits—remain outside the demonstrated application slice. They should be wired to source planners/services when that workflow is brought into scope rather than implemented as decorative local behavior.

## Merge and release gate

This example is not accepted merely because it bundles. Before this source-first work merges or backs a beta:

1. source hashes must match the pinned DAW revision;
2. disposable promotion/probe workflows must be absent;
3. lint, typecheck, tests, builds, Solid 1 checks and release tests must pass;
4. package smoke and the normal Ubuntu/macOS/Windows matrix must be green;
5. the macOS native window must remain recognizably faithful to the pinned source for the included slice.

Material layout, hierarchy, typography, control, state-treatment or interaction differences remain defects. Genuine GPUIX capability gaps are documented explicitly instead of being hidden behind approximate source rewrites.
