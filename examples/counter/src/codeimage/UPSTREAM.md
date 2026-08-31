# CodeImage upstream reference

This example now keeps the pinned CodeImage editor `App` composition source-shaped and moves native-only substitutions behind `compat.tsx`.

- Project: CodeImage
- Author: Riccardo Perra
- Repository: https://github.com/riccardoperra/codeimage
- Pinned upstream revision: `27b185f18d36f2baec3a8cc5a43e8794586096c3`
- Upstream editor entry point: `apps/codeimage/src/pages/Editor/App.tsx`
- Upstream Solid version at that revision: `1.9.12`
- Vendored source: `../../upstream/codeimage/apps/codeimage/src/pages/Editor/App.tsx`

`app.tsx` preserves the upstream editor shell and component boundaries: toolbar, left sidebar, portal host, canvas, keyboard/mobile actions, frame handler, managed/preview frame, frame toolbar, footer, and right sidebar/theme switcher. GPUIX-native replacements for CodeImage stores, UI-kit components, CodeMirror-dependent editor behavior, browser modality, export/share behavior, and styling live in `compat.tsx` rather than changing that application composition into a new UI.

The vendored source and MIT license are verified byte-for-byte by `bun run source:check` using Git blob hashes in `upstream/codeimage/upstream-lock.json`.
