# Solid 1 Kobalte compatibility gallery

This example is the manual, visual, and automated compatibility gate for the Kobalte-shaped native API published by `@jhomra21/gpuix-solid1`.

The gallery imports the components through the root `@jhomra21/gpuix-solid1/kobalte` barrel. The DAW fixture separately exercises the individual Kobalte subpath exports, so both public import styles stay covered.

## Published surface covered

Every currently exported compatibility area is represented in the native window and exercised by `test:native`:

- Button — press, disabled state, Enter and Space activation
- Image — `Root`, `Img`, and deterministic `Fallback`
- Separator — horizontal and vertical orientations
- TextField — `Root`, `Label`, controlled `Input`, controlled `TextArea`, `Description`, invalid `ErrorMessage`, and disabled state
- Tooltip — hover/focus opening and Escape dismissal through a native anchored layer
- Dialog — trigger, portal, overlay, content, title, description, Escape/outside dismissal, and close button
- DropdownMenu — trigger, portal, content, items, disabled item, separator, group/label, checkbox, indicator, radio group/items, and submenu
- ContextMenu — native right-click positioning, items, disabled item, separator, group/label, and submenu
- Menubar — multiple menus, triggers, portal/content, disabled item, separator, and submenu
- ColorMode — provider/hook state plus propagation into native class/style color mode
- polymorphic compatibility types remain part of the package-level typecheck

The page also acts as an explicit boundary: it is exhaustive for what `gpuix-solid1` currently exports, not a claim that every component in upstream `@kobalte/core` has a native adapter yet. Broader primitives such as Accordion, Checkbox, Combobox, Popover, Select, Slider, Switch, Tabs, Toast, and ToggleButton remain future compatibility work unless and until they are exported here.

## Run from the repository root

```sh
bun run example:solid1-kobalte
```

The example is self-contained: it installs/builds the local Solid 1 host first, then bundles and launches the gallery against `@gpuix/native ^0.5.1`.

Native window:

- title: `Kobalte Compatibility — Solid 1 + GPUIX`
- size: 1180 × 820

## Automated gate

```sh
bun run solid1:kobalte
```

The native test uses the same 1180 × 820 viewport as the real gallery and captures the untouched dark-mode page to:

```text
/tmp/gpuix-solid1-kobalte-gallery.png
```

The test then exercises component behavior, including disabled controls, keyboard activation, controlled text input/textarea, theme switching, floating layers, menu groups and submenus, native right-click context menus, and all dialog dismissal paths.

## Manual visual and interaction check

Verify that:

1. The support matrix shows all ten published compatibility areas without clipping or overlapping text.
2. The two-column component area remains aligned and scrollable at 1180 × 820.
3. Theme switching updates the complete painted palette, including fields and popup/dialog surfaces.
4. Buttons activate from pointer, Enter, and Space; disabled controls remain inert.
5. Input and TextArea editing remain controlled; invalid and disabled TextField states are visibly distinct.
6. Source-backed Image and no-source Fallback states are both visible and deterministic.
7. Tooltip, DropdownMenu, ContextMenu, Menubar, and Dialog floating layers are positioned coherently and dismiss correctly.
8. Dropdown checkbox/radio state and menu submenus update without corrupting surrounding state.
9. ContextMenu opens only from a real right click.
10. No native runtime errors are printed while opening, closing, and repeatedly interacting with floating content.

## Native compatibility boundary

This is a Kobalte-shaped native compatibility layer, not a browser DOM implementation of Kobalte. Portal content is represented by GPUIX native floating/anchored layers.

The current GPUIX `<img>` host does not expose image load/error callbacks, so a failed image request cannot yet transition to a Kobalte fallback based on an error callback. The gallery therefore tests one deterministic source-backed state and one deterministic no-source fallback state.
