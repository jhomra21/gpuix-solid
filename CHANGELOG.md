# Changelog

## Unreleased

<!-- Add user-facing changes here before preparing a release. -->

## 0.1.1 - 2026-09-15

- Refresh the repository and npm package documentation for the stable `gpuix-solid` line, move the public Solid 2 starter from the npm `beta` tag to `^0.1.0`, and align the root quickstart with upstream GPUIX where the Solid integration has a tested equivalent.
- Record the successful external foreground acceptance run against the published stable `gpuix-solid@0.1.0` and `@gpuix/native@0.8.0` pair. This release contains no renderer runtime changes.

## 0.1.0 - 2026-09-15

- Qualify the Solid 2 `0.1.0` line for stable promotion after the exact published `gpuix-solid@0.1.0-rc.1` and `@gpuix/native@0.8.0` pair passed external macOS foreground acceptance with no crash or fatal `GpuixView` error.
- Clarify the supported framework split. `gpuix-solid` is the Solid 2 renderer, while `@jhomra21/gpuix-solid1` is the separately versioned Solid 1 renderer with a `solid-js >=1.9.0 <2` peer range and maintained CI coverage.
- Record the exact React GPUIX 0.8.0 versus Solid Mail differential gate that passed 14 shared native scenarios before stable release preparation.

## 0.1.0-rc.1 - 2026-09-14

- Prepare the 0.1.0 release-candidate line by moving starter/install docs to the npm `beta` channel instead of pinning an older prerelease and by adding a reproducible fresh-registry foreground acceptance harness for the original Counter interaction path plus the GPUIX 0.8 accessibility/textarea/text-decoration surface.
- Reframe the GPUIX 0.8 foreground-input note around the current evidence: the source-level ownership risk remains unresolved, while the actual published beta.7 + native 0.8.0 external-consumer foreground pass succeeded. Stable promotion now requires the same two-app foreground gate against the exact release candidate.

## 0.1.0-beta.7 - 2026-09-14

- No user-facing changes.

## 0.1.0-beta.6 - 2026-09-14

- Raise the native renderer baseline from `@gpuix/native ^0.7.0` to `^0.8.0` across the Solid 2 package, Solid 1 package, examples, experiments, lockfile policy, and pinned GPUIX source-edge validation. The 0.8 line adds the upstream accessibility/ARIA bridge, textarea newline behavior, text decoration, HTTP images, file-drop/window additions, primary mouse-up click delivery, macOS event-pump changes, runtime-error resilience, and other published native improvements that GPUix Solid can now target directly.
- Keep the known GPUIX 0.8 physical foreground selection re-entrancy defect explicit rather than carrying the rejected Solid-side workaround. A source-built 0.8.0 candidate with the isolated native ownership patch passed the full GPUix Solid edge matrix and real foreground click/selection testing; the upstream native fix remains tracked separately before this limitation can be removed.

## 0.1.0-beta.5 - 2026-09-14

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

