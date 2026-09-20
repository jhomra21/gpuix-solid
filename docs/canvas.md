# Native Canvas2D

GPUix Solid has an experimental native Canvas2D path for source-edge development. It keeps browser-shaped drawing on the Solid side and sends a retained, versioned draw list to GPUIX, where GPUI paints paths and text directly.

This is intentionally separate from the published `@gpuix/native@0.9.0` contract. A normal 0.9 install has no Canvas renderer capability, so `canvas.getContext("2d")` returns `null`. The pinned source-edge build applies the audited Canvas patch from `patches/gpuix/canvas-v1.patch`; that build advertises draw-list protocol version 1 and enables the context.

## Model

The Canvas boundary has two owners:

- GPUix Solid implements browser-facing Canvas state, transforms, path recording, validation, and command coalescing.
- GPUIX implements the native custom element, layout surface, GPUI path/text painting, and native pointer delivery.

The wire value is one `drawList` custom prop:

```ts
{
  version: 1,
  width: 300,
  height: 150,
  commands: [...]
}
```

Transforms are resolved before serialization. `save()` and `restore()` remain local state and do not add protocol commands. Multiple synchronous drawing calls are coalesced into one host update at the next microtask boundary. A full-backing-store `fillRect()` whose hex or RGB paint can be proven opaque is treated as an occlusion boundary, so common immediate-mode redraw loops do not accumulate an unbounded retained command history. Other color syntaxes stay retained rather than risking an incorrect discard.

## Canvas2D v1

The first protocol supports:

- `fillRect()` and `strokeRect()`;
- `beginPath()`, `closePath()`, `moveTo()`, `lineTo()`, `quadraticCurveTo()`, and `bezierCurveTo()`;
- `rect()` and `arc()`, with arcs lowered to cubic Bézier segments before the native boundary;
- `fill()` and `stroke()`;
- string `fillStyle` and `strokeStyle`;
- `globalAlpha`;
- `lineWidth`;
- `fillText()` with font family, size, weight, alignment, and baseline;
- `save()`, `restore()`, `translate()`, `scale()`, `rotate()`, `transform()`, and the six-number `setTransform()` overload; filled geometry can use arbitrary affine transforms, strokes require a rotation/reflection plus uniform scale, and text requires translation plus positive uniform scale;
- `clearRect()` when it clears the full backing store;
- native click, auxiliary click, mouse/pointer down, move, up, outside-down, scroll, hover, file drop, and pointer continuity for drag-style interactions.

Canvas `width` and `height` are backing-store dimensions and default to the browser values 300×150. CSS/native `style.width` and `style.height` control the painted layout size; GPUI scales the draw list from backing-store coordinates into the laid-out surface.

## Fail-closed limits

Protocol v1 rejects behavior it cannot reproduce instead of drawing an approximation. Current limits include:

- gradients and Canvas patterns;
- the `evenodd` fill rule; v1 accepts `nonzero` only;
- partial `clearRect()`;
- `fillText()` `maxWidth` and multiline text;
- object-form `setTransform()`;
- non-default line caps, joins, and miter limits;
- image/video drawing, pixel readback, compositing modes, filters, clipping, shadows, and `Path2D`;
- non-uniform/sheared stroke transforms and rotated/reflected text transforms.

These are protocol-version decisions rather than permanent API exclusions. Add a command only when GPUI can paint it with a deterministic native test. Diffusion Editor's upstream waveform currently depends on `roundRect()` plus path clipping, so moving that renderer onto native Canvas needs a deliberate GPUI clipping design rather than an approximate fallback.

## Validation

The ordinary package suite covers the recorder and the capability handshake without requiring patched native binaries. The pinned source-edge lane additionally builds the exact GPUIX source plus the Canvas patch and runs a GPU-backed acceptance that:

1. requires draw-list protocol version 1;
2. paints rectangles, paths, a circle, and native text;
3. inspects the retained `drawList`;
4. drives a press, captured move outside the Canvas bounds, and release;
5. captures a non-empty native screenshot.

Run it through the complete pinned edge gate:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare
bun run gpuix:edge:check
```

The patch stack uses `git apply --check`. If upstream GPUIX changes the same native area, the edge lane fails at the patch boundary instead of silently carrying overlapping code. Once GPUIX contains an equivalent Canvas implementation, remove the downstream patch and advance the exact source pin.

## Media and WebCodecs

Canvas is a paint boundary, not a codec boundary. MediaBunny already exposes custom audio/video decoder registration, so future native media work can use a separate napi-rs codec package and register those decoders without coupling decode state to the Canvas draw-list protocol. A later browser-compatible WebCodecs facade can sit over that codec layer where source compatibility requires it.
