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

## Visual source of truth

The fixture should look like the rendered `BasicExample` components on the real Kobalte documentation site, not like a separate GPUIX demo theme.

The current parity pass is based on Kobalte docs source revision `3d3266348816b492b027538168988703dc1604c0` from July 18, 2026. Preserve the component-level visual tokens from those examples when changing this fixture:

- Button and button-like triggers: 40px tall, 6px radius, 16px text, Kobalte blue (`hsl(200 98% 39%)` light / `hsl(201 96% 32%)` dark).
- TextField: 200px input, 6px radius, 14px/500 label, 16px input text, 12px description/error text.
- Image fallback: 56px circle using the Kobalte light/dark blue fallback treatment.
- Tooltip: 6px radius, 8px padding, 14px content text, inverted light/dark surface treatment.
- DropdownMenu, ContextMenu and Menubar popups: 220px minimum width, 8px padding, 6px radius, 32px items with 16px text.
- ContextMenu trigger: 300px wide, 2px outlined target with centered `Right click here.` copy. GPUIX does not currently expose CSS `border-style`, so the native target keeps the Kobalte geometry/color/weight but uses the available solid border rather than the website's dashed border.
- Dialog: 500px content width, 6px radius, 16px padding, 20px/500 title and 16px description.

The native renderer uses equivalent sRGB hex/rgba values for Kobalte's HSL colors where needed.

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

1. The fixture reads as the Kobalte documentation examples rather than the old custom dark dashboard.
2. Theme toggle switches the complete Kobalte example palette between dark and light, including inputs, menus, tooltip and dialog surfaces.
3. Button and button-like triggers preserve the 40px Kobalte geometry and interaction colors.
4. Hovering or focusing the tooltip trigger opens the anchored tooltip with the inverted Kobalte tooltip treatment.
5. TextField editing remains controlled and the invalid field keeps its error message visible.
6. The `KB` and `J` image fallbacks render at 56px with the same circular fallback treatment as the docs.
7. Dropdown menu opens; checkbox, radio item, and submenu interactions work while retaining the 220px/32px menu geometry.
8. The context menu opens from a real right-click rather than a normal left click.
9. Menubar menus and submenu open and selections update the last-action status.
10. Dialog opens above its 20%-black overlay and closes from its close button or Escape; outside dismissal should behave natively as well.

## Current compatibility boundary

This is a Kobalte-shaped native compatibility layer, not a DOM implementation of Kobalte. Portal content is represented by native floating/anchored layers rather than browser portals.

The current GPUIX `<img>` host does not expose image load/error callbacks, so a failed native image load cannot yet switch a Kobalte-style image to fallback from that callback. The visual fixture therefore uses deterministic no-source fallback states instead of deliberately requesting an invalid remote asset. This keeps the checkpoint free of an expected asset-cache failure while preserving the limitation explicitly here.

Tailwind `class`, `className`, and Solid `classList` translation are deliberately out of scope for this gate. That bridge starts only after this native Kobalte fixture is manually accepted.
