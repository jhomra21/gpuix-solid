# Solid 1 blurred window

Solid port of remorses/gpuix `examples/blurred-window.tsx`, pinned conceptually to upstream `main` at `09e0caeb1812eece10a3a8a7200ef18567610267`.

The example uses GPUIX's native macOS blurred window backdrop rather than simulating blur in Solid:

- `titlebarTransparent: true`
- `windowBackground: "blurred"`
- custom traffic-light coordinates
- translucent GPUI surfaces above the native backdrop

Run from the repository root on macOS:

```sh
bun run example:solid1-blurred-window
```

Upstream project and example are MIT licensed.
