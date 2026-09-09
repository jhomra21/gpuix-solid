# CodeImage upstream reference

This example keeps the pinned CodeImage editor `App` composition source-shaped and moves native-only substitutions behind compatibility modules.

- Project: CodeImage
- Author: Riccardo Perra
- Repository: https://github.com/riccardoperra/codeimage
- Pinned upstream revision: `27b185f18d36f2baec3a8cc5a43e8794586096c3`
- Upstream editor entry point: `apps/codeimage/src/pages/Editor/App.tsx`
- Upstream Solid version at that revision: `1.9.12`
- Vendored source: `../../upstream/codeimage/apps/codeimage/src/pages/Editor/App.tsx`

`app.tsx` preserves the upstream editor shell and component boundaries: toolbar, left sidebar, portal host, canvas, keyboard/mobile actions, frame handler, managed/preview frame, frame toolbar, footer, and right sidebar/theme switcher. GPUIX-native replacements for CodeImage stores, UI-kit components, CodeMirror-dependent editor behavior, browser modality, export/share behavior, and styling live in compatibility modules rather than changing that application composition into a new UI.

The source lock includes the visible toolbar owners (`Toolbar`, `Toolbar.css`, `ToolbarSettings`, `SettingsDialog`, `UserBadge`, `Changelog`, and `GitHubLoginButton`). The native toolbar adapter preserves their interaction contract: Settings and Changelog open interactive local dialogs, Dashboard and GitHub preserve navigation intent at the isolated-example boundary, the user badge opens its Logout menu, Logout transitions to the source GitHub sign-in fallback, and sign-in restores the logged-in toolbar. External navigation and Auth0 remain deterministic service boundaries rather than being replaced with decorative controls.

The source lock also includes `PropertyEditor/EditorStyleForm.tsx`, which owns the visible language/theme/formatter, line-number, font-weight, and ligature controls represented by the native adapter, plus the exact preset and theme-switcher owners used for those source-shaped surfaces. Preset provenance includes the exact `PresetSwitcher`, `PresetPreview`, `PresetUpdateDialog`, `RenameContentDialog`, and `ConfirmDialog` owners so add/update/rename/share/delete/sync behavior can be checked against the source rather than approximated from screenshots.

The vendored source and MIT license are verified byte-for-byte by `bun run source:check` using Git blob hashes in `upstream/codeimage/upstream-lock.json`.
