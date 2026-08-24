# Changelog

## Unreleased

- Keep the public automation `launch({ env })` contract structural so TypeScript consumers do not need the global `NodeJS` namespace just to use the packaged automation API.

## 0.1.0-beta.0 - 2026-08-24

- Initial beta of the Solid 2 universal renderer for GPUIX and Zed GPUI.
- Native host-element, event, lifecycle, selection, layout, and animation parity coverage.
- Solid-native Tooltip, Select, Combobox, and `animate.*` APIs.
- Native TestRenderer, locator automation, live stdio transport, deterministic clock, retained-tree snapshots, and screenshot parity.
