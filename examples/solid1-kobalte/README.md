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

The parity pass is pinned to Kobalte `main` revision `3d3266348816b492b027538168988703dc1604c0` (August 23, 2026). Preserve both the component tokens and the example composition from that revision when changing this fixture:

- Button and button-like triggers: intrinsic width like Kobalte's `display: inline-flex; width: auto`, 40px tall, 6px radius, 16px text, Kobalte blue (`hsl(200 98% 39%)` light / `hsl(201 96% 32%)` dark).
- TextField: 200px input, 6px radius, 14px/500 label, 16px input text, 12px description/error text.
- Image fallback: 56px circle using the Kobalte light/dark blue fallback treatment. The native fallback child is rounded as well as its root because GPUIX child clipping differs from browser overflow clipping.
- Tooltip: intrinsic 40px trigger, 6px content radius, 8px padding, 14px content text, inverted light/dark surface treatment.
- DropdownMenu, ContextMenu and Menubar popups: 220px minimum width, 8px padding, 6px radius, 32px items with 16px text.
- Menu shortcut copy follows the Kobalte examples (`⌘+K`, `⇧+⌘+K`, `⌘+T`) rather than DAW-specific placeholder shortcuts.
- Menubar: centered `Git`, `File`, `Edit` three-trigger composition from the real example.
- ContextMenu trigger: 300px wide, 2px dashed target with centered `Right click here.` copy. Native `StyleDesc` does not expose CSS `border-style`, so the fixture composes small native edge segments to reproduce the dashed frame rather than substituting a solid outline.
- Dialog trigger: intrinsic 40px button. Dialog content keeps the proven native anchored implementation while matching the Kobalte 500px content surface, 6px radius, 16px padding, 20px/500 title and 16px description.

The native renderer uses equivalent sRGB hex/rgba values for Kobalte's HSL colors where needed.

## Composition rules

Do not wrap each primitive in a generic card or stretch triggers to fill a fixture column. Those choices make the fixture look like a GPUIX component dashboard even when the individual color and size tokens are correct.

GPUIX does not expose CSS `inline-flex`. For this fixture, button-like examples emulate Kobalte's intrinsic inline-flex sizing with a non-stretching native flex item. Native tests assert the resulting painted widths for Tooltip, DropdownMenu and Dialog triggers so a future layout change cannot silently turn them back into full-column bars.

The example intentionally uses open whitespace, intrinsic controls and lightweight labels so the rendered primitives themselves have the same visual hierarchy as Kobalte's docs. Fixture-only controls such as the color-mode toggle are visually subdued and should not be mistaken for a Kobalte `BasicExample`.

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

1. The fixture reads as a collection of Kobalte documentation examples rather than a custom dashboard: no component cards and no stretched button/menu/dialog triggers.
2. Theme toggle switches the complete Kobalte example palette between dark and light, including inputs, menus, tooltip and dialog surfaces.
3. Button and button-like triggers preserve the intrinsic-width 40px Kobalte geometry and interaction colors.
4. Hovering or focusing the tooltip trigger opens the anchored tooltip with the inverted Kobalte tooltip treatment.
5. TextField editing remains controlled and the invalid field keeps its error message visible.
6. The `KB` and `J` image fallbacks render as true 56px circles rather than square fallback children.
7. Dropdown menu opens; checkbox, radio item, shortcuts and submenu interactions work while retaining the 220px/32px menu geometry.
8. The context target visibly uses a dashed 300px native frame, centers `Right click here.` in both axes, and opens only from a real right-click.
9. The Menubar is centered with Git/File/Edit triggers; menus and submenu open and selections update the last-action status.
10. Dialog opens through the proven native anchored implementation and closes from its close button or Escape.

## Current compatibility boundary

This is a Kobalte-shaped native compatibility layer, not a DOM implementation of Kobalte. Dropdown, context, tooltip, menubar and dialog portal content is represented by native floating/anchored layers rather than browser portals.

The current GPUIX `<img>` host does not expose image load/error callbacks, so a failed native image load cannot yet switch a Kobalte-style image to fallback from that callback. The visual fixture therefore uses deterministic no-source fallback states instead of deliberately requesting an invalid remote asset. This keeps the checkpoint free of an expected asset-cache failure while preserving the limitation explicitly here.

Tailwind `class`, `className`, and Solid `classList` translation are deliberately out of scope for this gate. That bridge starts only after this native Kobalte fixture is manually accepted.
