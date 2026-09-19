# Styling

GPUix Solid styling has two authoring layers over the same native GPUIX style contract: direct `style` objects and source-friendly class names. Neither layer creates browser CSS at runtime.

## Direct native styles

A `style` object maps onto the tested GPUIX `StyleDesc` surface. It covers layout, sizing, spacing, positioning, backgrounds, borders, shadows, typography, overflow, cursors, selection behavior, and native hover/active state.

```tsx
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingX: 16,
    paddingY: 12,
    borderRadius: 8,
    backgroundColor: "#18181b",
    color: "#f4f4f5",
    hover: { backgroundColor: "#27272a" },
    active: { opacity: 0.85 },
  }}
/>
```

Numbers use the units expected by the GPUIX property. Dimension fields also accept the browser-shaped string forms that the host explicitly normalizes, including pixel/rem dimensions and percentage-like values where the native renderer supports them.

## Layout shorthands

The Solid host expands the following authoring conveniences before native delivery:

- `paddingX`, `paddingY`, `marginX`, `marginY`;
- `size`;
- `inset`, `insetX`, `insetY`;
- CSS-shaped aliases such as `background-color`, `font-family`, `font-weight`, `text-align`, `white-space`, `overflow-x`, and `overflow-y`.

Explicit physical properties win over a shorthand that would otherwise write the same field.

## Classes

Solid 2 accepts `class`, `className`, and Solid's reactive `classList`.

Without a generated manifest, GPUix Solid includes a strict built-in utility subset for common flex layout, spacing, sizing, colors, typography, radius, opacity, cursors, and `hover:` / `active:` variants.

```tsx
<div class="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800" />
```

Unsupported built-in tokens are reported rather than silently pretending to work.

For source-pinned applications, `configureNativeStyleManifest()` installs the generated mapping and becomes authoritative. This is how larger Tailwind/browser-derived codebases can preserve their real source classes while explicitly tracking native gaps.

## Inheritance

The host currently propagates the native text/environment properties that source applications rely on, including visibility, color, font size/family/weight, text alignment, line height, white space, cursor, user selection, and selection color.

This is a deliberate compatibility layer, not a promise that every CSS inherited property exists.

## State styling

GPUIX 0.9 exposes direct element hover and active style state, represented as nested `style.hover` and `style.active`.

Ancestor relationship state such as Tailwind `group-hover:*` / `group-active:*` is not currently exposed by the published GPUIX contract. Generated manifests must mark those tokens unsupported or adapt the application explicitly; GPUix Solid should not simulate native ancestor state with a hidden parallel UI system.

## Text and decoration

The public native style surface covers the tested text fields used by current examples, including font size/family/weight, line height, alignment, white space, truncation, line clamp, selection color, and underline/line-through decoration.

Semantic browser tags can inherit those properties, but GPUIX 0.9 does not expose a general per-run rich-text contract equivalent to independently styled HTML spans inside one laid-out paragraph.

## Animation

Use `animate.div` for native interpolation rather than a JavaScript frame loop:

```tsx
<animate.div
  initial={{ opacity: 0, width: 80 }}
  to={{ opacity: 1, width: 160 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```

The animation vocabulary is intentionally limited to the fields GPUIX can interpolate natively.

## Source portability rule

Prefer the browser-shaped authoring form only when GPUix Solid can compile it deterministically into the native contract. When semantics are unavailable, keep the limitation visible and add the capability to GPUIX first.
