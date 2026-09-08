# DAW Browser Convex Solid 1 dogfood source

This native example exercises a focused UI slice from `jhomra21/daw-browser-convex` against the Solid 1 GPUIX host.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `2eaad47813b15aa8511bab8dc04625510c977b12`
- framework: Solid 1
- GPUIX native range: `^0.7.0` (the checked-in Bun lock resolves `0.7.0`)

## Fidelity contract

This fixture is source-first, not screenshot-first. Browser-facing source is copied byte-for-byte whenever GPUIX can host it. Compatibility belongs below copied source—in the Solid host, generated style bridge, or narrow service/type adapters—not in edited replicas of the upstream component.

Deterministic local data replaces Convex, collaboration, persistence, audio-engine and plugin backends. It must not replace visible source behavior. Controls included in the fixture remain interactive and keep their state at the fixture boundary.

`bun run source:check` rejects drift from the pinned revision. The current closure contains **81 exact upstream files**: 75 UI/layout/runtime files, 4 exact waveform-package files, and the exact `Eq.tsx` plus `eq-render-work.ts`. The main source check compares normalized checkout content to expected Git blobs. The waveform and EQ checks independently verify their committed source against the pinned Git blobs so compatibility work cannot leak into those copied files.

## GPUIX version policy

The repository targets the latest reviewed GPUIX release line, `@gpuix/native ^0.7.0`, rather than floating production dependencies to an unreleased upstream commit. The root lock resolves `0.7.0` reproducibly. Moving to a later GPUIX release requires an explicit dependency/lock update and the full Linux, macOS, Windows, package-smoke, Solid 1 and native-fidelity suite.

A separate source-edge lane builds the commit pinned in `/.gpuix/edge.json`. That lane is a compatibility probe, not the published dependency. The pin is intentionally advanced only after reading and auditing current upstream source.

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
- `Eq`, `eq-render-work`, and `EqFilterTypeSelect`
- the copied DAW UI primitives and timeline/layout helpers used by those components
- the exact `clip-color.ts` helper, including its selected/ghost `color-mix(in srgb, …, transparent)` output
- the exact upstream waveform `render-waveform.ts`, `extract-peaks.ts`, `resample-peak-pairs.ts`, and waveform types

`src/native/ArrangementOverview.tsx` is only a re-export of the exact copied overview. The old retained-div recreation is gone.

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
| `src/native/EffectsPanel.tsx` | mounts exact Compressor and exact EQ with deterministic local device state |
| `src/compat/useClipWaveformViewModel.ts` | delegates waveform geometry to exact upstream `getAudioWaveformLayout` and supplies deterministic peak bytes in place of the unavailable audio/backend service |
| `src/compat/eq-visual-audio.ts` | visual-only `OfflineAudioContext` / `BiquadFilterNode.getFrequencyResponse()` compatibility used by exact EQ graph drawing; it does not render or process audio |
| `src/compat/gpuix-solid-ui.ts` + `src/compat/layered-canvas.ts` | DAW universal-renderer facade for the semantic Canvas2D surface used by exact waveform/EQ source; the historically named `layered-canvas.ts` currently emits one retained multicolor SVG image, not tint layers |
| `src/compat/two-row-grid-layout.ts` | narrow two-row child placement compatibility for the exact EQ grid definition |

Record arm is singular at the fixture application boundary: arming one track disarms the previous track rather than preserving independent legacy booleans as simultaneous armed state.

## Remaining native/browser capability boundaries

These are limitations of the current GPUIX/browser contract, not permission to invent alternate source UI.

### Mixer volume paint

The pinned `MixerVolumeSlider` remains byte-for-byte source. It writes `--mixer-volume-percent`, `--mixer-volume-automation-start`, and `--mixer-volume-automation-end`; the pinned stylesheet uses those variables to produce a hard warning/muted split plus a 4 px automation strip over that base.

GPUIX 0.7 supports structured two-stop gradients, but it does not evaluate arbitrary browser CSS background strings driven by CSS custom properties. The DAW universal-renderer boundary therefore registers only those exact mixer paint variables. It converts the source hard split into a muted native base plus a retained warning segment, and converts a non-empty automation interval into a full-width retained flex layer containing a percentage-width spacer followed by the automation segment. This keeps the source component, source CSS, slider mapping, colors, and automation start/end math unchanged while using geometry GPUIX 0.7 actually accepts.

This is not generic CSS-gradient or custom-property support. Styles with none of the registered mixer paint variables pass through unchanged, and an empty automation interval removes the overlay rather than leaving stale paint. Native regression coverage proves that isolation invariant, exact source-derived split/interval geometry, and reactive updates. The dedicated macOS automated-state screenshot additionally verifies that the 4 px automation color overlays the intact warning/muted base instead of replacing or displacing it.

### Canvas 2D

GPUIX 0.7 does not expose a browser `CanvasRenderingContext2D`. The DAW fixture therefore provides a narrow compatibility surface at the Solid universal-renderer boundary rather than rewriting copied waveform or EQ source.

Semantic `<canvas>` creation is intercepted only by the DAW universal module. The active facade records the static operations exercised by the pinned source: string fill/stroke paints, line width, image smoothing state, `setTransform`, full-surface `clearRect`, `fillRect`, `beginPath`, `moveTo`, `lineTo`, full-circle `arc`, `fill`, `stroke`, `fillText`, font, text alignment and text baseline. It serializes the ordered draw stream into one multicolor SVG data image and batches native updates through the owning root. Identity circle transforms are omitted; real transforms remain explicit. Unsupported partial clears, partial arcs and unsupported text transforms fail closed instead of being silently approximated.

The exact copied `ClipComponent`, `SampleDetailWaveform`, waveform renderer, waveform layout, `Eq.tsx`, and `eq-render-work.ts` remain source-owned. The fixture fabricates only deterministic peak/audio metadata and the visual-only filter-response service that the real application normally gets from unavailable backends/browser APIs. Drawing algorithms, graph sampling, colors and Canvas calls remain upstream. This is a GPUix Solid compatibility bridge, **not** a claim that `@gpuix/native@0.7.0` has native Canvas support.

The EQ fixture passes `spectrumData={null}`. Consequently the source's live-spectrum-only `createLinearGradient`, `quadraticCurveTo` and `globalAlpha` branch is intentionally not executed in this UI-only fixture. Those wider Canvas capabilities are not claimed by this compatibility surface.

### EQ Eight

`Eq.tsx` and `eq-render-work.ts` are now exact pinned source, not a native recreation. The source's three-column/two-row device layout is hosted through the narrow two-row grid compatibility layer. Solid 1's DOM environment supplies browser-shaped `ResizeObserver` and `requestAnimationFrame`; the exact source uses those APIs to size and schedule its graph. `eq-visual-audio.ts` supplies only the deterministic Biquad frequency response required to draw the static curve.

The source deliberately schedules its initial Canvas draw through nested animation frames. Native visual acceptance therefore waits three real animation frames—the same readiness gate used by the interaction test—before inspecting or capturing the graph. The acceptance detector requires the exact graph source to contain the source dB/frequency labels and numbered nodes, then captures a dedicated macOS EQ frame. Manual review of that frame verifies the graph background/grid, response curve, labels, all eight nodes, selected-band treatment, controls and two-row layout.

There is still no live analyser/spectrum or audio processing in this fixture. `spectrumData=null` is the explicit boundary.

## Host compatibility proved by this port

The DAW source exposed generic gaps that were fixed in the host instead of being hidden in local replicas. Solid 1 and Solid 2 stay aligned where their framework contracts overlap.

Notable coverage includes:

- production/test element bounds and browser-shaped `getBoundingClientRect()`
- native focus, blur, selection, scroll offsets and pointer-capture bookkeeping
- event target/currentTarget ownership and controlled input value synchronization
- browser-compatible `Element` / `HTMLElement` identity where source checks it, including semantic `HTMLCanvasElement` identity in the DAW facade
- global pointer forwarding used by unchanged timeline/ruler source
- minimal `document.body.classList` drag-state compatibility
- browser-shaped `ResizeObserver` and animation-frame scheduling in the Solid 1 DOM environment
- inline grid parsing and narrow two-row placement needed by copied EQ source
- semantic hidden/data-attribute style handling
- SVG event/paint compatibility used by copied components
- native range elements with intrinsic control geometry rather than text-editor backing
- transparent Tailwind OKLCH color mixing and exact upstream sRGB `color-mix(..., transparent)` normalization into native sRGB alpha
- exact source mixer hard-split and automated-range paint through registered CSS-variable compatibility that leaves unrelated styles untouched
- source pointer transparency/ownership semantics so decorative descendants do not steal hits
- local Solid 1 host rebuilds before standalone example bundling, preventing stale ignored `dist` output from masking source changes
- semantic DAW Canvas handling through an instance-scoped compatibility facade rather than a global host-node prototype patch

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
- exact EQ source graph, filter menu, Freq/Gain/Q controls, band enable/disable, channel mode and reset semantics
- exact Sample Detail controls with deterministic BPM/stretch services
- package build/smoke and release-tool regression checks

The macOS CI path uploads canonical native DAW screenshots for the source-structured app, exact EQ, mixer, and automated mixer state. A green automated run does not waive a material visual mismatch found in manual side-by-side comparison.

## Intentionally omitted systems

The complete source application contains collaboration, Convex, TanStack Router, persistence/history, real audio rendering, VST3 hosting, the full device catalog and broader editing workflows. Those systems are outside this renderer fixture. Deterministic service adapters replace them only where needed to keep the included source UI executable.

Some exact `TrackLane` callbacks for editing operations outside the focused fixture—such as full resize planning, duplicate/delete services, missing-media recovery and fade commits—remain outside the demonstrated application slice. They should be wired to source planners/services when that workflow is brought into scope rather than implemented as decorative local behavior.

## Merge and release gate

This example is not accepted merely because it bundles. Before this source-first work merges or backs a beta:

1. all **81** pinned source files must match the pinned DAW revision;
2. disposable promotion/probe workflows and temporary diagnostic screenshots must be absent;
3. lint, typecheck, tests, builds, Solid 1 checks and release tests must pass;
4. package smoke and the normal Ubuntu/macOS/Windows matrix must be green;
5. the DAW Canvas waveform detector, exact static EQ graph detector, and exact mixer hard-split/automation detector must pass against the retained native tree;
6. the macOS source-structured, exact EQ, mixer and automated-mixer captures must remain recognizably faithful to the pinned source for the included slice;
7. the pinned GPUIX source-edge lane must pass against the explicitly audited commit in `/.gpuix/edge.json`.

Material layout, hierarchy, typography, control, state-treatment or interaction differences remain defects. Genuine GPUIX capability gaps are documented explicitly instead of being hidden behind approximate source rewrites.
