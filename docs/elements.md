# Elements

GPUix Solid JSX is browser-shaped where that improves source portability, but it renders a GPUIX retained tree rather than a DOM. Intrinsic tags fall into three groups: native GPUIX elements, semantic source aliases, and inline SVG markup.

## Native elements

| JSX element | Native role |
| --- | --- |
| `div`, `text` | general layout and text |
| `img` | native image from a file, data URL, or supported HTTP source |
| `svg` | native SVG image; inline SVG children are serialized into its source |
| `canvas` | source-compatible intrinsic only on GPUIX 0.9; there is no registered native paint adapter or public draw-list API yet |
| `input`, `textarea` | controlled native text input |
| `anchored` | floating native surface positioned relative to a point |
| `code` | native syntax-highlighted code surface |
| `diff` | native diff surface |
| `markdown` | native Markdown surface |
| `virtual-list` | retained virtualized list |

The native element set follows the published `@gpuix/native@0.9.0` contract. A capability is not documented as supported merely because GPUI has an equivalent Rust API. `canvas` remains in the JSX surface so browser-derived source can be typed and intercepted by narrow compatibility layers, but GPUIX 0.9's custom-element registry does not register a Canvas adapter; using the intrinsic directly is not native drawing support.

## Semantic source aliases

Common browser tags can be used when porting Solid source:

`span`, `p`, headings, `strong`, `em`, `small`, `label`, `button`, sections, navigation/layout tags, lists, forms, figures, and `a`.

Text-shaped tags map to the native text host; layout-shaped tags map to the native div host. They preserve useful source metadata and events, but they do not create an HTML DOM and should not be used as evidence that an arbitrary browser API exists.

In particular, a semantic `<span>` is not a general GPUI rich-text run. Arbitrary independently styled/clickable runs inside one native text layout remain a native GPUIX gap.

## Inline SVG

GPUix Solid accepts common SVG child tags such as `path`, `g`, `defs`, gradients, `rect`, `circle`, `line`, `polygon`, masks, and `use`. The Solid host serializes the inline subtree into the owning native `svg` source.

This is source compatibility, not a DOM SVG implementation. Browser measurement and mutation APIs are only available where GPUix Solid explicitly provides compatibility behavior.

## Shared element props

Normal host elements support the tested subset of:

- native `style`;
- `class`, `className`, and Solid `classList`;
- `ref`;
- `testId`;
- focus and tab metadata;
- roles and `aria-*` metadata supported by the native accessibility bridge;
- browser-shaped `data-*` and common source metadata used by source-pinned applications;
- native pointer, keyboard, focus, input, scrolling, file-drop, and semantic drag/drop events.

See [Styling](./styling.md) and [Events](./events.md) for the exact authoring surfaces.

## Anchored surfaces

`<anchored>` exposes the positioning vocabulary supported by GPUIX 0.9: side/alignment positioning, explicit native anchors, offsets, fit/snap behavior, deferred priority, and occlusion.

For higher-level controlled UI, prefer the Solid-native `Tooltip`, `Select`, and `Combobox` components instead of rebuilding their ownership behavior directly from an anchored element.

## Rich native elements

`code`, `diff`, and `markdown` accept GPUIX theme data rather than browser CSS for their internal native rendering. They are useful when the application wants GPUIX's native high-level renderer instead of composing the same content from lower-level elements.

## Lists

`<virtual-list>` supports normal children plus the retained-list properties exposed by GPUIX: alignment, tail following, overdraw, estimated item height, explicit item count/window start, and visible-range notifications.

Imperative retained-list scrolling is available through the exported `list` helper. See [Desktop and native integration](./desktop.md).

## Capability rule

When an intrinsic or prop is missing, do not substitute an unrelated browser implementation. First check [Compatibility](./compatibility.md) and [Upstream parity](./upstream-parity.md). If the native contract is missing the capability, treat it as a GPUIX gap and add it upstream rather than hiding a second renderer inside GPUix Solid.
