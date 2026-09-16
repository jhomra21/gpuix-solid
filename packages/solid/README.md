# gpuix-solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix) and Zed's GPU-accelerated GPUI framework.

Write Solid components in TypeScript and render them as native GPUIX trees. There is no Electron renderer and no browser web view.

This package is the Solid 2 renderer. Solid 1 applications use the separate `@jhomra21/gpuix-solid1` package from the same repository.

The `0.2.x` line targets exact `@gpuix/native@0.9.0` and the paired Solid 2 RC.8 runtime: peer `solid-js ^2.0.0-rc.8` with direct `@solidjs/universal@2.0.0-rc.8`.

## Install

```bash
bun add gpuix-solid solid-js@2.0.0-rc.8
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

## Solid-native primitives

Helpers that create reactive state or subscriptions use Solid's `create*` convention:

- `createWindowSize()` samples native window geometry under the current owner.
- `createWindowInsets()` exposes safe-area and IME geometry.
- `createTextSearch()` owns find/highlight state for native text search.
- `createTextSelection()` exposes GPUIX window selection as a Solid accessor and provides `clear()`.

The older `useWindowSize`, `useWindowInsets`, and `useTextSearch` exports remain as deprecated compatibility aliases. `useGpuix()` keeps its name because it reads an existing context rather than creating reactive ownership.

## Reactive text selection

GPUIX 0.9 can report window-level text-selection changes. In Solid code, prefer `createTextSelection()` over manually mirroring the low-level callback into component state. The primitive returns a normal Solid accessor and owns the native subscription for the lifetime of the calling Solid owner.

```tsx
import { Show } from "solid-js"
import { createTextSelection } from "gpuix-solid"

function SelectionStatus() {
  const selection = createTextSelection()

  return (
    <div style={{ gap: 8, flexDirection: "column" }}>
      <Show
        when={selection.text()}
        fallback={<text style={{ color: "#888" }}>Nothing selected</text>}
      >
        {(text) => <text style={{ color: "#f5f5f5" }}>Selected: {text()}</text>}
      </Show>
      <div role="button" tabIndex={0} onClick={selection.clear}>
        <text style={{ color: "#f5f5f5" }}>Clear selection</text>
      </div>
    </div>
  )
}
```

`render(..., { onSelectionChange })` remains available as the low-level GPUIX-compatible window event boundary. Application components normally do not need it when they can consume the reactive primitive directly.

## Runtime and testing

The package exports the renderer and JSX runtime, native host components, Solid primitives, animation helpers, test renderer helpers, and `gpuix-solid/automation` for live native-process automation.

The `0.2.x` repository baseline uses exact `@gpuix/native@0.9.0` plus the paired Solid 2 RC.8 runtime. CI exercises macOS arm64, Linux x64 GNU, Windows x64 MSVC, the exact pinned GPUIX 0.9 source lane, the Solid 2 package tarball, clean RC.8 consumers, and native interaction/parity fixtures. The 0.1 release records remain historical qualification evidence for the earlier GPUIX 0.8 line.

For the complete Vite configuration, Solid 1 setup, examples, compatibility notes, source-pinned GPUIX parity work, and release history, see the [GPUix Solid repository](https://github.com/jhomra21/gpuix-solid).
