# Changelog

## Unreleased

<!-- Add user-facing changes here before preparing a release. -->

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
