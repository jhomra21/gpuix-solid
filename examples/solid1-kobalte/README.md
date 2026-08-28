# Verbatim Kobalte docs fixture

This example proves that real Kobalte documentation source can run on the Solid 1 GPUIX renderer without rewriting the copied application code.

The fixture is pinned to `kobaltedev/kobalte` commit `3d3266348816b492b027538168988703dc1604c0` (August 23, 2026). The exact repository, revision, copied files, and upstream Git blob SHAs are recorded in `upstream-lock.json`.

## Source invariant

The architecture is:

```text
verbatim checked-in upstream TSX + CSS modules
        ↓
module/CSS compatibility layer
        ↓
Solid universal renderer
        ↓
GPUIX native host
```

Files under `src/upstream/kobalte/` are checked-in verbatim copies from the pinned Kobalte repository. They are application source, not generated lookalikes and not local GPUIX rewrites. Do not patch them to make GPUIX work.

`bun run source:check` hashes every copied file as a Git blob and compares it with the blob recorded from the pinned upstream commit. Any drift fails immediately with an instruction to fix compatibility underneath the copied source instead.

Kobalte's source keeps its normal imports such as:

```ts
import { Dialog } from "@kobalte/core/dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
```

The Vite resolver redirects those imports to the native Solid 1 compatibility surface. The upstream examples do not know that they are running on GPUIX.

The selected upstream CSS modules are also checked in unchanged. `scripts/generate-native-kobalte-css.mjs` compiles their supported selectors into a native class manifest, including deterministic CSS-module scoping, light/dark variants, hover/active rules, and supported data-state selectors.

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

The check first proves the checked-in Kobalte files still have the exact upstream Git blob SHAs. On macOS, where `TestGpuixRenderer` is available, it then interacts with the actual copied examples and validates native visual geometry/state as well as behavior.

The test intentionally targets visible text from the pinned upstream source rather than inserting test IDs into copied files.

## Run the native window

On macOS:

```sh
bun run example:solid1-kobalte
```

The window is titled `Kobalte Upstream Source — Solid 1 + GPUIX` and renders the same checked-in upstream source used by the automated gate.

## Updating Kobalte

`bun run sync:upstream` is an explicit source-update operation. Normal builds never replace the checked-in Kobalte files.

To test a newer upstream revision:

1. Update the pinned commit/file blob SHAs in `upstream-lock.json`.
2. Run `bun run sync:upstream` to replace the checked-in copies with that exact pin.
3. Run the normal fixture generation/check command.
4. Fix newly exposed incompatibilities in the renderer, native Kobalte surface, CSS compiler, or module bridge—not in `src/upstream/kobalte/`.
5. Keep the upstream license and attribution in sync.

That rule is the important part of this fixture: when upstream code stops working, the compatibility layer moves toward the app rather than the app moving toward GPUIX.
