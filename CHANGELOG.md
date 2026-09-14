# Changelog

## Unreleased

<!-- Add user-facing changes here before preparing a release. -->

- Align the Solid 2 and Solid 1 hosts with the current `@gpuix/native` 0.7 release line, including native two-stop linear gradients, `WindowOptions` passthrough, raw window key handling, last-window lifecycle termination, and the published native TestRenderer availability guard.
- Improve browser-source compatibility in the native hosts with browser-shaped element bounds, focus/selection/scroll and pointer-capture behavior, controlled input/range synchronization, SVG/event semantics, intrinsic native range geometry, and transparent CSS color-mix normalization used by upstream component source.
- Keep native windows responsive after JavaScript runtime failures by isolating event-handler exceptions, continuing the frame pump after a thrown tick, and installing one process-level uncaught-error logger for native-window renders.
- Expand source-first dogfooding to 13 Solid 2 live applications—Counter, Native Text, Blurred Window, Todo, Diff, Timeline, Mail, Diffusion Studio, Chat, Infinite Chat, Dashboard, CodeImage, and TanStack Kitchen Sink—plus the Solid 1 legacy, Kobalte, blurred-window, Tailwind, and DAW consumers. The source-derived examples remain pinned to their audited upstream source while browser/service gaps stay behind narrow native compatibility boundaries.
- Port the DAW showcase around 81 exact pinned source files, including TrackSidebar, TrackLane/ClipComponent, automation, ArrangementOverview, Sample Detail, MixerVolumeSlider, Compressor, EQ, clip-color, and waveform paths, while keeping documented Canvas/EQ capability boundaries explicit instead of replacing source with lookalikes.
- Reduce retained timeline and DAW interaction churn: pan-only timeline updates no longer wake scale/geometry consumers, and DAW clip dragging keeps canonical project state stable during pointer movement with a lightweight transient native preview, minimal pointer-up commit, concurrent-edit preservation, and target revalidation so a disappearing or incompatible destination cannot lose a clip.
- Harden cross-platform validation so macOS, Ubuntu, Windows, Solid 1 compatibility, native DAW/Kobalte fixtures, source-linked GPUIX edge builds, release-tool tests, and exact-package smoke checks cover the source-first compatibility work before publication.

## 0.1.0-beta.4 - 2026-08-27

- Rename the Solid 2 npm package from `@jhomra21/gpuix-solid` to `gpuix-solid`, including workspace consumers, JSX compiler configuration, exact-package smoke tests, documentation, and release identity checks.
- Add a Solid 2 + GPUIX native CodeImage editor example adapted from the MIT-licensed Solid 1.9.12 CodeImage application, including reactive frame/code/theme controls and native TestRenderer screenshot coverage.

## 0.1.0-beta.3 - 2026-08-24

- Fix Solid 2 reconciliation when a text host node is used as an `insertBefore` anchor, allowing application-shaped component trees to mount and update without rejecting valid text anchors.
- Add a complex native Solid 2 dashboard dogfood fixture with Overview, Tasks, Notes, Weather, and Account pages, deterministic demo data, native animations, floating controls, native inputs, reactive list mutations, and TestRenderer automation coverage.
- Expand native validation so Ubuntu CI installs the GPUI runtime dependencies and runs GPU-backed renderer/dashboard integration alongside macOS; Windows continues to lint, typecheck, test platform-independent behavior, and build while the upstream `@gpuix/native@0.4.0` hosted-runner binding issue is documented explicitly.

## 0.1.0-beta.2 - 2026-08-24

- Validate the exact release tarball in a clean external Solid 2 TSX/Vite consumer, including `Tooltip`, `Select`, `Combobox`, `animate.*`, and the automation subpath.
- Add an owner-only release-control command that can prepare future releases from the stable GitHub control issue without requiring an Actions UI click.

## 0.1.0-beta.1 - 2026-08-24

- Initial beta of the Solid 2 universal renderer for GPUIX and Zed GPUI.
- Native host-element, event, lifecycle, selection, layout, and animation parity coverage.
- Solid-native Tooltip, Select, Combobox, and `animate.*` APIs.
- Native TestRenderer, locator automation, live stdio transport, deterministic clock, retained-tree snapshots, and screenshot parity.
- Keep the public automation `launch({ env })` contract structural so TypeScript consumers do not need the global `NodeJS` namespace just to use the packaged automation API.
