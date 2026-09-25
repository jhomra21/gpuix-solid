# Native Canvas2D

GPUix Solid has an experimental native Canvas2D path for source-edge development. The Solid host implements the browser-facing context and records a compact draw list. GPUIX replays that list with GPUI path, text, clipping, and image painting.

This is separate from the published `@gpuix/native@0.9.0` contract. A normal 0.9 install does not expose the Canvas renderer capability, so `canvas.getContext("2d")` returns `null`. The pinned source-edge build applies `patches/gpuix/canvas-v1.patch` and advertises draw-list protocol version 5.

## How it works

GPUix Solid owns Canvas state, transforms, path lowering, validation, command retention, text measurement calls, clipping metadata, and image uploads. GPUIX owns the native Canvas element, GPUI painting, clip-mask painting, uploaded image resources, and pointer delivery.

The retained property contains drawing commands, not image bytes:

```ts
{
  version: 5,
  width: 300,
  height: 150,
  commands: [...]
}
```

Geometry and image destination transforms are resolved before serialization. Protocol v5 keeps the six-number affine matrix on each `fillText()` command so native text can preserve rotation, reflection, scale, and shear. `save()` and `restore()` stay local and do not add protocol commands. Synchronous drawing calls are coalesced into one host update at the next microtask boundary.

A full-backing-store opaque `fillRect()` is an occlusion boundary. The recorder can discard older commands behind it instead of growing an immediate-mode redraw loop without a bound.

Canvas `width` and `height` are backing-store dimensions and default to 300 by 150. Native layout width and height control the painted size. GPUI scales backing-store coordinates into the laid-out Canvas element.

## Canvas2D v5

Protocol v5 supports:

- `fillRect()`, `strokeRect()`, and full-backing-store `clearRect()`;
- `beginPath()`, `closePath()`, `moveTo()`, `lineTo()`, `quadraticCurveTo()`, and `bezierCurveTo()`;
- `rect()`, `arc()`, `arcTo()`, and numeric `roundRect()` radii;
- `fill()` and `stroke()` with the nonzero fill rule;
- string `fillStyle` and `strokeStyle`;
- `globalAlpha`;
- `lineWidth`;
- `fillText()` with font family, size, weight, alignment, baseline, and retained affine transforms;
- synchronous `measureText()` backed by GPUI text shaping;
- `save()`, `restore()`, `translate()`, `scale()`, `rotate()`, `transform()`, and the six-number `setTransform()` overload;
- rectangular `clip()`, uniform `roundRect()` clipping, nested rectangle intersections, and one rounded clip combined with rectangular scissoring;
- `drawImage()` with the 3, 5, and 9 argument forms for readable canvas-like RGBA sources;
- source-rectangle clipping for `drawImage()`;
- native click, auxiliary click, mouse and pointer down/move/up, outside-down, scroll, hover, file drop, and captured-pointer continuity.

`roundRect()` and `arcTo()` are lowered to cubic paths before the native boundary. Negative rectangle dimensions keep browser corner assignment. When a uniform `roundRect()` is used directly as the clip path, v5 also records its bounds and radius so the native renderer can preserve the rounded mask.

`measureText()` sends one synchronous request to GPUI's text system. The current Canvas transform does not alter the returned CSS-pixel width.

For unrotated text, GPUI paints the shaped line directly. For a non-identity affine text transform, the native Canvas renderer rasterizes the shaped text as an SVG alpha mask and applies GPUI's `TransformationMatrix` to that sprite. This keeps Diffusion's rotated HUD labels and dimension readouts in the same retained Canvas command stream.

`drawImage()` uploads RGBA bytes through a binary N-API method and stores only an image resource id in the JSON draw list. The Canvas element owns the native image resource and drops replaced resources. `globalAlpha` is applied to the uploaded image alpha because the pinned GPUI version does not expose its element-opacity helper outside the GPUI crate.

## Current limits

The recorder rejects unsupported operations instead of silently changing their meaning. Uniform `roundRect()` clipping is the one deliberate approximation. GPUI's current content mask is rectangular, so the native patch paints the rounded boundary as subpixel-height horizontal mask strips. Current limits include:

- gradients and Canvas patterns;
- the `evenodd` fill rule;
- partial `clearRect()`;
- arbitrary clip paths, mixed-corner rounded clip radii, rotated rounded clips, and multiple different rounded clips in one active clip stack;
- `fillText()` `maxWidth` and multiline text;
- object-form `setTransform()`;
- non-default line caps, joins, and miter limits;
- non-uniform or sheared stroke transforms;
- rotated or sheared `drawImage()` destination transforms;
- direct `ImageBitmap`, `HTMLImageElement`, and video-frame image sources that do not expose readable Canvas2D pixels;
- Canvas compositing modes, filters, shadows, and `Path2D`;
- pixel readback from the native Canvas.

The first `drawImage()` implementation is a correctness path for Diffusion's canvas-backed images and video frame cache. Large video frames should move to the existing VideoToolbox and IOSurface path rather than copying RGBA pixels every frame.

## Diffusion Studio coverage

Current Diffusion Studio source uses `roundRect()`, mixed-corner `arcTo()`, clipping, `measureText()`, `globalAlpha`, affine text transforms, and `drawImage()` in its runtime and editor drawing code. Protocol v5 covers the geometry, text, uniform rounded clipping, and canvas-backed image path used by the real EditorPage timeline and HUD.

CI also checks the exact current Diffusion source pin at `666cdced1f6b97a792b63e551f45797649efb27a` from editor 0.206.0. That test imports Diffusion's real runtime and reconciler, creates and renders a real scene through the GPUix Canvas recorder, and exercises Diffusion's `mount()` evaluator with a compiled universal-renderer bundle.

The Solid 1 source acceptance mounts Diffusion's real provider chain and `EditorPage`. It exercises `EngineCanvas`, camera panning, Rectangle insertion, object movement and resizing, the real timeline canvas, inspector and soundboard geometry, and native window sizing. The live acceptance also checks that HUD updates remain responsive after the resize path runs. It writes separate source-engine, editor, and live screenshots. The remaining Canvas work includes arbitrary clip paths, more paint state, and direct native media-frame drawing.

## Validation

The regular package tests cover command recording and capability checks without a patched native binary. The pinned source-edge lane builds the exact GPUIX source plus the Canvas patch.

The native Canvas acceptance checks the current protocol version, paths, clipping, text shaping, retained affine text commands, binary image upload, pointer continuity, and a non-empty screenshot. The complete edge gate also reruns the MediaBunny and native video-frame checks so Canvas changes cannot silently break the media path.

Run the full pinned edge gate with:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare
bun run gpuix:edge:check
```

Run the current Diffusion runtime source check with:

```bash
bun run diffusion:runtime:source
```

The GPUIX patch stack uses `git apply --check`. If upstream changes the same native code, preparation fails before the patched build starts. Once GPUIX ships equivalent Canvas support, the downstream patch can be removed and the source pin advanced.

## Media and WebCodecs

Canvas handles painting, not codec ownership. `@jhomra21/gpuix-mediabunny` already provides native MediaBunny decoder and GPUI presentation paths, including VideoToolbox and IOSurface-backed frames on supported macOS codecs.

The current Canvas `drawImage()` bridge starts with readable RGBA sources because it matches Diffusion's existing Canvas2D contract. The next media step is to let Diffusion's video path hand native frames to GPUIX without an RGBA copy while preserving the same editor/runtime behavior.
