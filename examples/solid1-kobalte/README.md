# Solid 1 Kobalte compatibility fixture

This example is the manual and automated compatibility gate for the Kobalte-shaped native primitives used by the pinned DAW UI before any Tailwind/class bridge work begins.

It runs on `@jhomra21/gpuix-solid1` and renders directly through GPUIX. The fixture currently covers:

- Button
- Image / avatar fallback
- Separator
- TextField
- Tooltip
- Dialog
- DropdownMenu
- ContextMenu
- Menubar
- ColorMode
- polymorphic compatibility types

## Run on macOS

From the repository root:

```sh
bun run example:solid1-kobalte
```

The command builds the Solid 1 package and launches the native window:

- title: `Kobalte Compatibility — Solid 1 + GPUIX`
- size: 1180 × 820

## Manual visual and interaction check

Before moving on to the Tailwind/class bridge, verify the native window itself:

1. The two-column layout is aligned and readable with no controls pinned unexpectedly to the top-left.
2. Theme toggle updates its displayed mode.
3. Action button responds; disabled button does not.
4. Hovering or focusing the tooltip trigger opens the anchored tooltip.
5. TextField editing remains controlled and the invalid field keeps its error message visible.
6. Avatar fallback renders deterministically.
7. Dropdown menu opens; checkbox, radio item, and submenu interactions work.
8. The context menu opens from a real right-click rather than a normal left click.
9. Menubar menus and submenu open and selections update the last-action status.
10. Dialog opens above its overlay and closes from its close button; Escape/outside dismissal should behave natively as well.

## Current compatibility boundary

This is a Kobalte-shaped native compatibility layer, not a DOM implementation of Kobalte. Portal content is represented by native floating/anchored layers rather than browser portals. A failed native image load cannot yet trigger the same fallback callback path as a browser image element, so the fixture also includes an explicit deterministic fallback state.

Tailwind `class`, `className`, and Solid `classList` translation are deliberately out of scope for this gate. That bridge starts only after this native Kobalte fixture is manually accepted.
