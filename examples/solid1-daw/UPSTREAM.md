# DAW Browser Convex Solid 1 dogfood source

This native example exercises a focused UI slice from `jhomra21/daw-browser-convex` against the Solid 1 GPUIX host.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `2eaad47813b15aa8511bab8dc04625510c977b12`
- framework: Solid 1
- GPUIX native range: `^0.7.0` (the checked-in Bun lock resolves `0.7.0`)

## Fidelity contract

This fixture is source-first, not screenshot-first. Browser-facing source is copied byte-for-byte whenever GPUIX can host it. Compatibility belongs below copied source—in the Solid host, generated style bridge, or narrow service/type adapters—not in edited replicas of the upstream component.

Deterministic local data replaces Convex, collaboration, persistence, audio-engine and plugin backends. It must not replace visible source behavior. Controls included in the fixture remain interactive and keep their state at the fixture boundary.

`bun run source:check` rejects drift from the pinned revision. The current closure contains **79 exact upstream files**: 75 UI/layout/runtime files plus 4 exact files from the upstream waveform package. The main source check compares normalized checkout content to the expected Git blobs, while the waveform check verifies the committed Git blobs directly and also validates the checkout after CRLF normalization so Windows line endings cannot create false source-drift failures.

## GPUIX version policy

The repository targets the latest reviewed GPUIX release line, `@gpuix/native ^0.7.0`, rather than floating to an unreleased upstream commit. The root lock resolves `0.7.0` reproducibly. Moving to a later GPUIX minor requires an explicit dependency/lock update and the full Linux, macOS, Windows, package-smoke, Solid 1 and native-fidelity suite.

The Solid 1 and Solid 2 hosts both carry the GPUIX 0.7 contracts used by this fixture, including the published test-renderer availability guard, `WindowOptions` passthrough, raw window key handling, native lifecycle termination, and two-stop linear-gradient support.

## Source that now runs directly

The parity scripts are the authoritative file lists. Important visible source now running through GPUIX includes:

- `TransportControls`
- `TimelineLeftBrowser`
- `TimelineRuler`
- `ArrangementOverview`
- `TrackLane` and its source `ClipComponent`
- `TrackSidebar` / source sidebar rows through a fixture model adapter
- `MixerVolumeSlider`, including its source-owned CSS-variable split and automated-range state
- `TimelineBottomPanelShell` and footer
- `AutomationLane`
- `SampleDetailPanel`, `SampleClipPanel`, and `SampleDetailWaveform`
- `Compressor`, its `EffectShell`, controls and SVG graph
- `EqFilterTypeSelect`
- the copied DAW UI primitives and timeline/layout helpers used by those components
- the exact `clip-color.ts` helper, including its selected/ghost `color-mix(in srgb, …, transparent)` output
- the exact upstream waveform `render-waveform.ts`, `extract-peaks.ts`, `resample-peak-pairs.ts`, and waveform types

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
| `src/compat/useClipWaveformViewModel.ts` | delegates waveform geometry to exact upstream `getAudioWaveformLayout` and supplies deterministic peak bytes in place of the unavailable audio/backend service |
| `src/compat/gpuix-solid-canvas.ts` | DAW universal-renderer facade for the narrow semantic Canvas2D surface plus explicitly registered CSS-variable paint patterns required by exact copied source |

Record arm is singular at the fixture application boundary: arming one track disarms the previous track rather than preserving independent legacy booleans as simultaneous armed state.

## Remaining native/browser capability boundaries

These are limitations of the current GPUIX/browser contract, not permission to invent alternate source UI.

### Mixer volume paint

The pinned `MixerVolumeSlider` remains byte-for-byte source. It writes `--mixer-volume-percent`, `--mixer-volume-automation-start`, and `--mixer-volume-automation-end`; the pinned stylesheet uses those variables to produce a hard warning/muted split plus a 4 px automation strip over that base.

GPUIX 0.7 supports structured two-stop gradients, but it does not evaluate arbitrary browser CSS background strings driven by CSS custom properties. The DAW universal-renderer boundary therefore registers only those exact mixer paint variables. It converts the source hard split into a muted native base plus a retained warning segment, and converts a non-empty automation interval into a full-width retained flex layer containing a percentage-width spacer followed by the automation segment. This keeps the source component, source CSS, slider mapping, colors, and automation start/end math unchanged while using geometry GPUIX 0.7 actually accepts: numeric absolute offsets and percentage widths.

This is not generic CSS-gradient or custom-property support. Styles with none of the registered mixer paint variables pass through unchanged, and an empty automation interval removes the overlay rather than leaving stale paint. Native regression coverage proves that isolation invariant, exact source-derived split/interval geometry, and reactive updates. The dedicated macOS automated-state screenshot additionally verifies that the 4 px automation color overlays the intact warning/muted base instead of replacing or displacing it.

### Canvas 2D

GPUIX 0.7 does not expose a browser `CanvasRenderingContext2D`. The DAW fixture therefore provides a narrow compatibility surface at the Solid universal-renderer boundary rather than rewriting the copied DAW waveform components.

Semantic `<canvas>` creation is intercepted only for the DAW universal module. `getContext("2d")` records the operations used by the pinned waveform source—`fillStyle`, `strokeStyle`, `lineWidth`, `imageSmoothingEnabled`, `setTransform`, full-surface `clearRect`, `fillRect`, `beginPath`, `moveTo`, `lineTo`, and `stroke`—and serializes them into an internal SVG surface that GPUIX can paint. Updates are batched to one microtask and flushed through the owning native root. Unsupported Canvas operations are not silently approximated; unsupported partial clears fail closed.

The exact copied `ClipComponent`, `SampleDetailWaveform`, waveform renderer and waveform layout code remain source-owned. The fixture fabricates only deterministic peak/audio metadata where the real audio service is absent. The drawing algorithm, layout, colors and Canvas calls remain upstream. This is a GPUix Solid compatibility bridge, **not** a claim that `@gpuix/native@0.7.0` has native Canvas support.

Native visual acceptance mounts the real DAW showcase through that same universal Canvas facade, waits for the batched paint, requires a substantial set of retained source-generated peak bars with clip-sized bounds inside the Drums lane, and only then captures the canonical macOS screenshot. Manual review remains required in addition to that detector.

### EQ Eight

The pinned EQ surface still depends on browser capabilities that do not map faithfully to GPUIX 0.7: broader Canvas 2D behavior, `ResizeObserver`-driven graph sizing, animation-frame drawing, Web Audio filter-response APIs, and child grid placement/span semantics used by the source layout.

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
- exact source mixer hard-split and automated-range paint through registered CSS-variable compatibility that leaves unrelated styles untouched
- source pointer transparency/ownership semantics so decorative descendants do not steal hits
- local Solid 1 host rebuilds before standalone example bundling, preventing stale ignored `dist` output from masking source changes
- semantic DAW canvas handling through an instance-scoped Canvas2D compatibility facade rather than a global host-node prototype patch

These are host or compatibility-layer features. DAW code should not grow local visual replicas of them.

## Native acceptance coverage

The automated native fixture exercises the included source slice across the normal CI matrix, including:

- transport and BPM state
- browser tabs, tree and search
- track selection, collapse, routing/sends, mute/solo, singular record arm, volume and automation controls
- exact source `MixerVolumeSlider` hard-split geometry plus automated 4 px range overlay, including reactive range changes and unrelated-style isolation
- exact overview, ruler and lane composition
- playhead/loop interaction
- source clip selection/open behavior and exact selected clip paint
- source clip colors and native alpha conversion
- exact `ClipComponent` waveform rendering through the Canvas2D compatibility boundary, with retained peak-bar and native-bounds assertions
- Effects / Clip bottom-panel switching, hide/show and resize state
- exact Compressor control/reset/collapse semantics
- EQ compatibility controls and exact source filter-type menu
- exact Sample Detail controls with deterministic BPM/stretch services
- package build/smoke and release-tool regression checks

The macOS CI path also uploads the native DAW screenshots used for visual review, including a dedicated automated mixer state. A green automated run does not waive a material visual mismatch found in manual side-by-side comparison.

## Intentionally omitted systems

The complete source application contains collaboration, Convex, TanStack Router, persistence/history, real audio rendering, VST3 hosting, the full device catalog and broader editing workflows. Those systems are outside this renderer fixture. Deterministic service adapters replace them only where needed to keep the included source UI executable.

Some exact `TrackLane` callbacks for editing operations outside the focused fixture—such as full resize planning, duplicate/delete services, missing-media recovery and fade commits—remain outside the demonstrated application slice. They should be wired to source planners/services when that workflow is brought into scope rather than implemented as decorative local behavior.

## Merge and release gate

This example is not accepted merely because it bundles. Before this source-first work merges or backs a beta:

1. all 79 pinned source files must match the pinned DAW revision;
2. disposable promotion/probe workflows must be absent;
3. lint, typecheck, tests, builds, Solid 1 checks and release tests must pass;
4. package smoke and the normal Ubuntu/macOS/Windows matrix must be green;
5. the DAW Canvas waveform detector and exact mixer hard-split/automation detector must pass against the retained native tree;
6. the macOS native window and dedicated automated mixer capture must remain recognizably faithful to the pinned source for the included slice.

Material layout, hierarchy, typography, control, state-treatment or interaction differences remain defects. Genuine GPUIX capability gaps are documented explicitly instead of being hidden behind approximate source rewrites.
