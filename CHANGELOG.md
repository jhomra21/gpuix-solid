# Changelog

## Unreleased

<!-- Add user-facing changes here before preparing a release. -->

- Add a complex native Solid 2 dashboard dogfood fixture with Overview, Tasks, Notes, Weather, and Account pages, deterministic demo data, native animations, floating controls, and TestRenderer automation coverage.

## 0.1.0-beta.2 - 2026-08-24

- Validate the exact release tarball in a clean external Solid 2 TSX/Vite consumer, including `Tooltip`, `Select`, `Combobox`, `animate.*`, and the automation subpath.
- Add an owner-only release-control command that can prepare future releases from the stable GitHub control issue without requiring an Actions UI click.

## 0.1.0-beta.1 - 2026-08-24

- Initial beta of the Solid 2 universal renderer for GPUIX and Zed GPUI.
- Native host-element, event, lifecycle, selection, layout, and animation parity coverage.
- Solid-native Tooltip, Select, Combobox, and `animate.*` APIs.
- Native TestRenderer, locator automation, live stdio transport, deterministic clock, retained-tree snapshots, and screenshot parity.
- Keep the public automation `launch({ env })` contract structural so TypeScript consumers do not need the global `NodeJS` namespace just to use the packaged automation API.
