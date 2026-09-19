# Roadmap

## M0 — repository and contracts

- [x] Solid 2 workspace
- [x] upstream attribution and notices
- [x] architecture and agent guidance
- [x] native renderer TypeScript contract
- [x] root-scoped host-node model
- [x] mutation driver and event registry
- [x] universal renderer adapter
- [x] counter fixture

## M1 — host kernel parity

- [x] validate against installed Solid 2 and `@gpuix/native`
- [x] intrinsic style/custom-prop typing
- [x] built-in and universal custom-prop forwarding
- [x] text, fragment, reorder, ref, multiple-root, and remount coverage
- [x] mirrored framework-neutral host behavior across Solid 1 and Solid 2

## M2 — native elements and capabilities

- [x] img, svg, canvas, input, textarea
- [x] anchored, code, diff, markdown, virtual-list
- [x] focus, scroll, selection, and window APIs
- [x] debug frame overlay
- [x] native animation bridge
- [x] accessibility metadata and native file drop
- [x] desktop dialogs, shell helpers, app-window helpers, and list helpers

## M3 — Solid-facing APIs

- [x] Tooltip, Select, and Combobox
- [x] Solid-native slot/as contract
- [x] `animate.*` over the native animation bridge
- [x] `createWindowSize()`, `createWindowInsets()`, `createTextSearch()`, and `createTextSelection()`
- [x] native utility-class subset plus generated style manifests
- [x] layout shorthands
- [x] JSX-free `h()` / `makeH()`

## M4 — testing and automation

- [x] native TestRenderer adapter
- [x] retained-tree and interaction parity
- [x] selection/layout parity
- [x] Playwright-like locator API
- [x] live launch/connect transport
- [x] live click, fill, key, wheel, file-drop, and semantic-drag automation
- [x] deterministic animation clock
- [x] screenshot parity suite
- [x] React/Solid Mail differential parity
- [x] pinned GPUIX source-edge lane

## M5 — Solid 1 ecosystem validation

- [x] isolated Solid 1 package/runtime line
- [x] browser-compatibility entry
- [x] Kobalte
- [x] Tailwind v4
- [x] blurred-window example
- [x] source-first DAW fixture
- [x] host parity checks shared with Solid 2

## M6 — release system

- [x] Linux, macOS, and Windows CI matrix
- [x] exact package staging and tarball smoke
- [x] Trusted Publishing/OIDC with npm provenance
- [x] metadata-only release PR flow
- [x] registry integrity and dist-tag verification
- [x] public stable `gpuix-solid@0.2.0`
- [x] public prerelease `gpuix-solid@0.2.1-beta.0`

## M7 — current 0.2.x stabilization

- [x] exact `@gpuix/native@0.9.0` baseline
- [x] paired Solid 2 RC.8 runtime baseline
- [x] GPUIX 0.9 window selection exposed as `createTextSelection()`
- [x] production batch adapter forwards the native selection subscription in both Solid renderers
- [x] nested context-menu delivery through retained descendants
- [x] native anchored/occluding overlay path for the Diffusion asset menu
- [x] clean external `0.2.1-beta.0` consumer validation
- [x] live-native selection state acceptance on candidate `ab6436a0744a2907dcbf9325efbc0365e30e5517`
- [ ] literal physical foreground mouse/trackpad selection acceptance on the current GPUIX 0.9 line
- [ ] publish and externally validate the next beta containing the post-`0.2.1-beta.0` fixes
- [ ] promote the 0.2.x line only after the intended beta acceptance gates are closed
