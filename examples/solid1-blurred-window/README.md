# Solid 1 blurred window

Solid 1 port of `remorses/gpuix` `examples/blurred-window.tsx`, audited against upstream `main` at `6b4be86952aa89cfe61bb573740aea33fef5c5c4`.

The example uses GPUIX's native macOS blurred window backdrop rather than simulating blur in Solid:

- `titlebarTransparent: true`
- `windowBackground: "blurred"`
- custom traffic-light coordinates
- translucent GPUI surfaces above the native backdrop

Run from the repository root on macOS:

```sh
bun run example:solid1-blurred-window
```

See `UPSTREAM.md` for the exact source blob, translation boundary, and the intentional distinction from the Solid 2 animated showcase.

Upstream project and example are MIT licensed.
