# Verbatim Kobalte docs fixture

This example proves that real Kobalte documentation source can run on the Solid 1 GPUIX renderer without rewriting the copied application code.

The fixture is pinned to `kobaltedev/kobalte` commit `3d3266348816b492b027538168988703dc1604c0` (August 23, 2026). The exact repository, revision, and copied files are recorded in `upstream-lock.json`.

## Source invariant

The architecture is:

```text
verbatim upstream TSX + CSS modules
        ↓
module/CSS compatibility layer
        ↓
Solid universal renderer
        ↓
GPUIX native host
```

Files under `src/upstream/kobalte/` are generated from the pinned Kobalte repository. Do not patch them to make GPUIX work. `bun run generate` recreates those files from upstream before compilation, so any local edits are intentionally discarded.

Kobalte's source keeps its normal imports such as:

```ts
import { Dialog } from "@kobalte/core/dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
```

The Vite resolver redirects those imports to the native Solid 1 compatibility surface. The upstream examples do not know that they are running on GPUIX.

The selected upstream CSS modules are also copied unchanged. `scripts/generate-native-kobalte-css.mjs` compiles their supported selectors into a native class manifest, including deterministic CSS-module scoping, light/dark variants, hover/active rules, and supported data-state selectors.

Kobalte's MIT license is copied alongside the upstream source.

## Covered upstream examples

The native fixture currently executes Kobalte's actual `BasicExample` source for:

- Button
- TextField
- Image
- Separator
- Tooltip
- DropdownMenu
- ContextMenu
- Menubar
- Dialog

`src/upstream-app.tsx` only arranges those unchanged examples in one native window, attaches fixture-level test IDs around them, and provides the color-mode environment. It does not reimplement the examples.

## Native compatibility below the source

Differences between browser Kobalte and GPUIX are handled outside the copied source. That includes:

- semantic HTML elements mapped to native host elements;
- inline SVG serialization for Kobalte's copied icons;
- CSS-module class translation into native `StyleDesc` values;
- native floating/anchored layers in place of browser portal positioning;
- event, focus, keyboard, right-click, and outside-pointer behavior;
- small Kobalte API compatibility surfaces required by the pinned docs revision.

This is intentionally not a DOM implementation. The goal is source compatibility for Solid applications while preserving native GPUIX rendering.

## Automated gate

From the repository root:

```sh
bun run solid1:kobalte
```

On macOS, where `TestGpuixRenderer` is available, the test interacts with the actual copied examples. It verifies, among other things:

- TextField native input;
- Kobalte's real 700 ms Tooltip hover delay;
- DropdownMenu open, checkbox, and submenu behavior;
- ContextMenu rejecting left-click, opening from right-click, checkbox behavior, and submenu behavior;
- Menubar switching across Git, File, and Edit;
- Dialog open and outside dismissal;
- color-mode changes.

The test intentionally targets the visible text from the pinned upstream source rather than inserting test IDs into copied files.

## Run the native window

On macOS:

```sh
bun run example:solid1-kobalte
```

The window is titled `Kobalte Upstream Source — Solid 1 + GPUIX` and renders the same copied source used by the automated gate.

## Updating Kobalte

To test a newer upstream revision:

1. Change the pinned revision and file list in `upstream-lock.json`.
2. Run the normal fixture generation/check command.
3. Fix any newly exposed incompatibility in the renderer, native Kobalte surface, CSS compiler, or module bridge—not in `src/upstream/kobalte/`.
4. Keep the upstream license and attribution in sync.

That rule is the important part of this fixture: when upstream code stops working, the compatibility layer moves toward the app rather than the app moving toward GPUIX.
