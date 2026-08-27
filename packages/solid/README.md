# gpuix-solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix) and Zed's GPU-accelerated GPUI framework.

The package provides a Solid universal renderer over `@gpuix/native`; it does not route through React and does not fork the native Rust renderer.

```bash
bun add gpuix-solid solid-js
```

```tsx
import { render } from "gpuix-solid"

render(
  () => (
    <div style={{ padding: 24 }}>
      <text>Hello from Solid + GPUI</text>
    </div>
  ),
  { title: "GPUix Solid" },
)
```

Native testing and live-process automation are available from `gpuix-solid/automation`.

For architecture, examples, compatibility, testing details, and release status, see the [GPUix Solid repository](https://github.com/jhomra21/gpuix-solid).
