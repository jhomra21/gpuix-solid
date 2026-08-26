# DAW Browser Convex Solid 1 dogfood source

This native example ports a focused UI slice from `jhomra21/daw-browser-convex`.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `3fb6ae9a10b8317feb23e77832e0894da7420f9b`
- framework: Solid 1

## Fidelity contract

This fixture is not a generic DAW mock. The native GPUIX version must preserve the current application's recognizable component hierarchy, geometry, tokens and interaction semantics.

The implementation is source-first, not screenshot-first. A browser-facing source component is copied verbatim when the GPUIX Solid host can represent its UI. Compatibility is fixed underneath that source instead of editing the copied component. A native visual leaf is allowed only when the pinned component depends on a browser rendering/runtime contract that GPUIX does not expose yet; those boundaries are listed explicitly below.

`bun run source:check` hashes every verbatim source file as a Git blob and rejects drift from the pinned revision.

## Pinned geometry

- left browser default width: 280px
- track sidebar minimum width: 336px
- arrangement overview: 24px
- timeline ruler: 32px
- normal track lane: 96px (`LANE_HEIGHT`)
- group indent: 12px
- shared bottom/effects panel body: 360px (`FX_PANEL_HEIGHT_PX`)
- bottom panel footer: 28px
- bottom edge padding: 4px
- Compressor device shell: 560px
- EQ Eight device shell: 704px
- Sample Detail label rail: 80px
- Sample Detail waveform: 960px

The native color constants are exact sRGB translations of the dark OKLCH tokens in the pinned `src/index.css`, including timeline background/surfaces, borders, clips, meters, playhead and device graph colors.

## Verbatim source running through GPUIX

These files are copied byte-for-byte from the pinned DAW revision and are protected by `scripts/check-upstream-source-parity.mjs`:

- `src/components/timeline/TransportControls.tsx`
- `src/components/timeline/browser/timeline-left-browser.tsx`
- `src/components/timeline/ArrangementOverview.tsx`
- `src/components/timeline/TimelineRuler.tsx`
- `src/components/timeline/TrackLane.tsx`
- `src/components/timeline/TimelineBottomPanelShell.tsx`
- `src/components/timeline/TimelineBottomPanelFooter.tsx`
- `src/components/timeline/grid-options.ts`
- `src/components/timeline/local-save-failure-banner.tsx`
- `src/components/timeline/toolbar-context.tsx`
- the copied DAW UI primitives listed by the parity script
- `src/lib/bottom-panel-layout.ts`
- `src/lib/bottom-panel-preferences.ts`

The DAW native Tailwind generator scans these source files directly. The generated style manifest is rebuilt before build, test and typecheck; it is not a hand-maintained translation of their class strings.

## Source-shaped adapters

These files own deterministic fixture state or bridge application services, but do not redefine a browser component that can run unchanged:

| Fixture adapter | Upstream responsibility | Native role |
| --- | --- | --- |
| `src/native/Timeline.tsx` | `src/components/Timeline.tsx` | deterministic project/transport/selection state and composition |
| `src/native/TimelineChrome.tsx` | `src/components/timeline/timeline-chrome.tsx` | mounts exact `TransportControls`; browser-only hidden inputs are omitted |
| `src/native/TransportControls.tsx` | exact `TransportControls.tsx` | supplies deterministic project/menu/MIDI services |
| `src/native/TimelineLeftBrowser.tsx` | exact browser source | maps fixture browser data/preferences into the source model |
| `src/native/TimelineWorkspace.tsx` | timeline workspace | composes exact ArrangementOverview, TimelineRuler and TrackLane around deterministic scrolling/sidebar state |
| `src/native/TrackLane.tsx` | exact TrackLane source | maps fixture tracks into upstream-shaped types; automation is disabled for this focused slice |
| `src/native/TimelineBottomPanelShell.tsx` | exact bottom shell | native sizing/event adapter around copied source |
| `src/native/TimelineBottomPanelFooter.tsx` | exact footer | re-export/adapter only |

## Explicit native visual leaves

The following visible pieces remain native implementations because the pinned browser components require capabilities that `@gpuix/native@0.4.0` cannot faithfully render. They must continue to follow the pinned source's dimensions, ordering and control vocabulary; they are not permission to invent a different design.

### ClipComponent

Pinned `src/components/timeline/ClipComponent.tsx` draws MIDI/audio content through an HTML Canvas 2D context and the waveform view-model. GPUIX exposes a native `<canvas>` host but not the browser `CanvasRenderingContext2D` API used by this component. `src/upstream/components/timeline/ClipComponent.tsx` is therefore a narrow bridge from exact `TrackLane` to `src/native/ClipComponent.tsx`.

The native leaf preserves clip start/duration geometry, 20px title header, waveform/MIDI visual vocabulary, selection treatment and drag hit target.

### TrackSidebar / TrackSidebarRow

The visible row is coupled in upstream to routing/group operations, automation lane metadata, mixer automation, track drag/drop, live stereo meter subscriptions, return/master sections and several controller services. Copying that controller into this deterministic renderer fixture would require a fake DAW backend larger than the UI slice.

The native row follows the pinned three-column geometry: track name/collapse, output/send routing, number/S/R controls, volume plus A/+ automation controls, and the stereo vertical meter strip. The source-specific TRACKS/MIXER labels that had existed in the earlier recreation were removed because upstream has blank overview/ruler header chrome.

### Compressor / EQ Eight

Pinned Compressor uses the DAW device shell, SVG transfer graph and a mixed CSS grid track definition (`84px 1fr 96px`). Current GPUIX `StyleDesc` only exposes equal-count grid rows/columns, so that source grid cannot be represented exactly.

Pinned EQ Eight additionally depends on Canvas 2D, `ResizeObserver`, requestAnimationFrame and Web Audio filter-response APIs. It cannot execute faithfully in the native host today.

`src/native/EffectsPanel.tsx` therefore keeps these as explicit visual leaves while matching the pinned device structure:

- Compressor: 560px shell; 84px left control stack; status/graph/Thresh-Knee-Look center; 96px Makeup/mode/Dry-Wet stack.
- EQ Eight: 704px shell; 72px Freq/Gain/Q strip; central graph; 72px mode strip; 52px eight-band selector.

### Sample Detail waveform

Pinned `SampleDetailWaveform.tsx` uses Canvas 2D, `ResizeObserver` and the waveform view-model. The native Clip tab therefore preserves the source composition instead of copying the canvas implementation: 80px Sample Detail rail, compact sample controls and a 960px native beat-grid/waveform leaf.

## GPUIX Solid compatibility added for this port

The source crossover exposed reusable host gaps that are fixed in the Solid host rather than hidden in DAW adapters. The Solid 1 and Solid 2 host files remain byte-for-byte mirrored.

- `HostElementNode.getBoundingClientRect()` uses production `GpuixRenderer.getElementBounds(id)`.
- host elements expose `focus()`, `blur()`, `select()`, `scrollTop`, `scrollLeft` and pointer-capture bookkeeping.
- native event dispatch now supplies the real host element as `event.currentTarget` / `event.target` and synchronizes input `value` before the handler runs.
- native host elements satisfy `instanceof Element` / `instanceof HTMLElement` in the Node runtime.
- a small native `window.addEventListener` bridge forwards pointer move/up/down events to global pointer listeners used by unchanged DAW source such as the ruler.
- a minimal `document.body.classList` facade supports source drag-state bookkeeping without browser DOM mutation.

These are generic GPUIX Solid capabilities. DAW source should not grow local replacements for them.

## Native interaction coverage

The focused fixture exercises:

- exact transport controls and live BPM
- browser tabs/tree/search
- track selection, activation/mute, solo, record-arm and volume
- exact arrangement overview/ruler/lane composition
- ruler playhead scrubbing and loop-region state through the source component
- clip drag entry, snapping and compatible cross-track movement when native held-pointer continuation is available
- Effects / Clip bottom-panel switching and hide/show
- reactive Compressor and EQ native-leaf controls
- source-shaped Sample Detail panel

`@gpuix/native@0.4.0`'s macOS `TestGpuixRenderer` currently delivers the initial mouse-down but does not reliably deliver the complete held move/up sequence required to automate every drag path. This is tracked at `remorses/gpuix#20`. Tests report the limitation rather than claiming synthetic drag coverage that the native binding does not provide. Physical-mouse behavior remains part of the manual macOS acceptance pass.

## Intentionally omitted application systems

The source application also contains collaboration, Convex, TanStack Router, Web Audio/native audio hosting, persistence, undo/history, full automation editing, VST3, drag-created tracks, multi-clip drag, Ctrl-drag duplication and a much larger device catalog. Those systems are not copied into this renderer fixture. Deterministic local adapters replace them so the test isolates Solid 1 reconciliation and GPUI rendering while retaining the source application's UI structure and interaction language.

## Merge gate

This example is not complete merely because it builds or its automated tests pass. Before PR #47 can merge, the native window must be manually compared side-by-side on macOS with the pinned DAW branch and accepted as recognizably the same UI for the included slice. Material layout, hierarchy, typography, control or state-treatment differences remain defects.
