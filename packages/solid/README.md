# gpuix-solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix) and Zed's GPU-accelerated GPUI framework.

This package is the Solid 2 renderer. Solid 1 applications use the separate `@jhomra21/gpuix-solid1` package in this repository. The two packages share the GPUIX native host contract but keep separate Solid runtime and peer-dependency ranges.

The `0.1.0` line targets `@gpuix/native ^0.8.0`. Release qualification currently exercises `solid-js@2.0.0-rc.1`, and the package peer range is `^2.0.0-rc.0`.

```bash
bun add gpuix-solid solid-js@2.0.0-rc.1
```

```tsx
import { render } from "gpuix-solid"

render(
  () => (
    <div style={{ padding: 24 }}>
      <text>Hello from Solid 2 + GPUI</text>
    </div>
  ),
  { title: "GPUix Solid" },
)
```

Native testing and live-process automation are available from `gpuix-solid/automation`.

For Solid 1 setup, architecture, examples, compatibility, testing details, and release status, see the [GPUix Solid repository](https://github.com/jhomra21/gpuix-solid).
