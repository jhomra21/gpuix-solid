# Events

GPUix Solid keeps event closures in JavaScript and tells GPUIX only which retained nodes have listeners. Native events are routed back to the owning Solid root, then Solid updates are flushed through the normal mutation path.

## Pointer and mouse events

Host elements support the tested pointer/mouse surface used by current applications:

`onClick`, `onDblClick`, `onAuxClick`, `onContextMenu`, mouse down/up/enter/leave/move, pointer down/up/cancel/enter/leave/move, lost pointer capture, and outside mouse-down handling.

Event payloads are browser-shaped where source compatibility requires it. They can include `currentTarget` / `target`, client coordinates, pointer ids, modifier keys, and `preventDefault()` / `stopPropagation()` compatibility behavior.

Pointer capture is application-visible through the compatibility target methods backed by GPUix Solid's root ownership model.

## Keyboard and focus

Elements support `onKeyDown`, `onKeyUp`, `onFocus`, `onBlur`, `autoFocus`, and `tabIndex`.

Window-scoped raw key events can also be passed to `render(..., { onKeyDown, onKeyUp })`.

GPUix Solid does not yet expose GPUI's declarative keymap/action binding surface. Application shortcuts currently use the raw key event path; a first-class native key-binding API belongs in GPUIX before the Solid binding claims it.

## Input

Native `input` and `textarea` elements use the controlled-value path. `onInput` and `onChange` receive the native edit and the Solid application can write its canonical value back through normal reactivity.

The maintained GPUIX 0.9 surface includes textarea newline handling and focus/tab behavior.

## Scrolling and lists

`onScroll` is available on host elements. `virtual-list` additionally exposes `onVisibleRange` for retained list windows.

Imperative scrolling is provided through the exported `list` helper rather than pretending a DOM `scrollTo()` method exists on every element.

## File drop

`onFileDrop` receives native Finder/OS file paths from GPUIX.

The native TestRenderer can synthesize file drops for deterministic tests. The current live stdio automation backend cannot synthesize an operating-system file drop, so live automation reports that capability as unsupported rather than faking it.

## Semantic application drag/drop

Internal application dragging uses:

`dragData`, `onDragStart`, `onDragOver`, `onDrop`, and `onDragEnd`.

The payload stays application-owned and JSON-like. GPUix Solid handles the pointer threshold, native hit testing, source preview, accepted/rejected drop behavior, and suppression of the source click after a completed drag.

This is separate from OS file drop.

## Native content events

The high-level native content elements expose their tested callbacks, including code/diff/markdown actions such as line/link/highlight events and list visibility notifications. Use the exported host types as the source of truth for the current release.

## Selection

GPUIX 0.9 window selection changes are available at the low-level root callback and through the Solid-native `createTextSelection()` primitive. Prefer the primitive for application state because it owns the subscription and cleanup under the current Solid owner.

## Measurement

There is not currently a public generic `onResize` intrinsic event. GPUix Solid has native bounds/query infrastructure for automation and compatibility work, but an element resize subscription should be added to the GPUIX contract before being presented as a normal cross-platform event.
