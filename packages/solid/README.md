# gpuix-solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix) and Zed's GPU-accelerated GPUI framework.

Write Solid components in TypeScript and render them as native GPUIX trees. There is no Electron renderer and no browser web view.

This package is the Solid 2 renderer. Solid 1 applications use the separate `@jhomra21/gpuix-solid1` package from the same repository.

The stable `0.1.x` line targets `@gpuix/native ^0.8.0`. The package peer range is `solid-js ^2.0.0-rc.0`, and release qualification exercises `solid-js@2.0.0-rc.1`.

## Install

```bash
bun add gpuix-solid solid-js@2.0.0-rc.1
bun add -d @solidjs/vite-plugin@3.0.0-next.29 vite@8.1.5 typescript@5.9.2
```

Compile Solid JSX through the universal renderer with `jsxImportSource: "gpuix-solid"` and `moduleName: "gpuix-solid"`. Keep `@gpuix/native` external so Bun can load its platform-specific native addon.

## Minimal app

```tsx
import { createSignal } from "solid-js"
import { render } from "gpuix-solid"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 24,
        gap: 12,
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
      }}
    >
      <text style={{ color: "#f5f5f5" }}>Count: {count()}</text>
      <div
        role="button"
        aria-label="Increment counter"
        tabIndex={0}
        onClick={() => setCount((value) => value + 1)}
        style={{
          width: 160,
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#292929",
          hover: { backgroundColor: "#383838" },
        }}
      >
        <text style={{ color: "#f5f5f5" }}>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "GPUix Solid",
  width: 800,
  height: 600,
})
```

Give native `<text>` nodes an explicit `color`. GPUI does not inherit text color from a parent the way browser CSS does.

## Runtime and testing

The package exports the renderer and JSX runtime, native host components, animation helpers, test renderer helpers, window geometry hooks, text-search helpers, and `gpuix-solid/automation` for live native-process automation.

The stable 0.1 line is validated against the published GPUIX 0.8 native contract on macOS arm64, Linux x64 GNU, and Windows x64 MSVC. Stable `gpuix-solid@0.1.0` also passed the external macOS foreground interaction test after publication.

For the complete Vite configuration, Solid 1 setup, examples, compatibility notes, source-pinned GPUIX parity work, and release history, see the [GPUix Solid repository](https://github.com/jhomra21/gpuix-solid).
