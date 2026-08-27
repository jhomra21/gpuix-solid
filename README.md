# GPUix Solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix), targeting [GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui), Zed's GPU-accelerated UI framework.

```text
Solid 2 + TypeScript
        │
        ▼
gpuix-solid
  Solid universal renderer
        │
        ▼
@gpuix/native
        │ napi-rs
        ▼
GPUI / Zed
        │
        ▼
Metal / DirectX / Vulkan
```

This project is an independently implemented Solid renderer built against GPUIX's public native mutation contract. It intentionally keeps the native GPUI bridge in `@gpuix/native` rather than forking the Rust layer.

## Status

M0 through M6 are complete. The renderer, native element surface, native capabilities, Solid-native component layer, testing/automation foundation, and release pipeline are implemented and parity-tested:

- Solid 2 universal renderer integration
- root-scoped JS shadow host tree
- retained-tree mutation protocol and batched N-API writes
- event registry, refs, lifecycle, and hot remount behavior
- GPUIX intrinsic JSX types and native element parity
- focus, scroll, selection, window, debug-overlay, and animation capabilities
- Solid-native `Tooltip`, `Select`, and `Combobox`
- Solid-native `as` slot renderer contract
- unified `animate.*` declarative animation API backed by native GPUI animation frames
- GPU-backed native TestRenderer adapter
- retained-tree, event/input, selection/layout, and screenshot parity coverage
- deterministic native animation-clock coverage
- Playwright-like `App` / `Locator` automation API over the native automation tree
- typed live stdio launch/connect automation transport
- cross-platform CI plus exact-tarball clean npm, Bun, and Solid TSX/Vite consumer validation
- tokenless npm Trusted Publishing/OIDC with registry integrity, dist-tag, SLSA provenance, immutable tag, and GitHub Release verification

`0.1.0-beta.2` is the first release published entirely through the steady-state Trusted Publishing/OIDC pipeline. M7 now focuses on real-consumer stabilization and the remaining live-automation gap. Production `GpuixRenderer` does not yet expose native keystroke injection, so live `fill()` / `press()` remains blocked upstream and is tracked in issue #35.

## Why a native Solid renderer

This is not a React compatibility layer and does not use a virtual DOM. Solid's compiler targets a custom universal runtime. Signals update the affected host properties or children directly, those mutations are reflected immediately in a small JS shadow tree, and native writes are batched into GPUIX's retained Rust tree.

```text
signal write
   │
   ▼
Solid computation
   │
   ├── update JS host node immediately
   │
   └── enqueue native mutation
              │
              ▼
          applyBatch()
              │
              ▼
       Rust RetainedTree
              │
              ▼
            GPUI
```

The JS shadow tree exists because Solid's universal reconciler needs synchronous `parent`, `firstChild`, and `nextSibling` answers while reconciling arrays. Native GPUI state can therefore remain batched without becoming the JS reconciler's query path.

## Usage

```tsx
import { animate, render } from "gpuix-solid"
import { createSignal } from "solid-js"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div style={{ padding: 24, gap: 12, flexDirection: "column" }}>
      <text>Count: {count()}</text>
      <div onClick={() => setCount(count() + 1)}>
        <text>Increment</text>
      </div>

      <animate.div
        initial={{ opacity: 0, width: 80 }}
        to={{ opacity: 1, width: 180 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ height: 44 }}
      >
        <text>Native GPUI animation</text>
      </animate.div>
    </div>
  )
}

render(() => <App />, { title: "Solid GPUIX" })
```

`animate.*` is the public animation surface. The underlying GPUIX `motion` descriptor remains an internal wire-format detail so animation frames stay in Rust/GPUI rather than running through a JavaScript frame loop.

See `examples/counter` for the first fixture.

## Testing and automation

The testing API uses the same Solid root, mutation driver, event registry, native retained tree, and GPUI rendering path as a normal app. GPU-backed tests are available when the installed `@gpuix/native` build exports `TestGpuixRenderer`.

```ts
import { createElement, insert, insertNode, setProp } from "gpuix-solid"
import { createTestRoot } from "gpuix-solid"
import { createTestApp } from "gpuix-solid/automation"

const testRoot = createTestRoot()

testRoot.render(() => {
  const root = createElement("div")
  const action = createElement("div")
  setProp(action, "testId", "save")
  setProp(action, "style", { width: 120, height: 40 })
  insert(action, "Save")
  insertNode(root, action)
  return root
})

const app = createTestApp(testRoot.renderer)
await app.getByTestId("save").click()
```

Locators query the native automation tree on demand instead of holding DOM-like element objects. Supported locator operations include `getByTestId`, `getByText`, `getByType`, nested locators, `count`, strict `element`, `bounds`, `click`, `fill`, `press`, `textContent`, and `waitFor`.

The `gpuix-solid/automation` subpath also provides the live-process transport:

```ts
import { launch } from "gpuix-solid/automation"

const app = await launch({
  command: "bun",
  args: ["run", "./dist/my-gpuix-app.js"],
})

await app.getByTestId("save").click()
await app.close()
```

A renderer launched with piped stdin exposes the typed SSE-over-stdio automation protocol automatically; normal TTY-launched apps are unchanged. Live tree queries, painted bounds, pointer click, screenshots, and deterministic clock operations are supported. `fill()` and `press()` currently return a typed `Unsupported` error for live production renderers because `GpuixRenderer` does not yet expose native keystroke injection. They remain fully supported through `TestGpuixRenderer`.

## Compatibility

See [docs/compatibility.md](./docs/compatibility.md) for the validated Solid, GPUIX native, toolchain, and operating-system matrix.

## Reference projects

The implementation is guided by four sources, for different reasons:

- **GPUIX by remorses** — canonical behavior, native mutation protocol, supported host elements, events, layout semantics, testing and automation behavior.
- **Mesurer Solid** — prior Solid 2 porting work: keep framework-neutral contracts separate from the renderer, prefer instance-owned state, use the Solid universal compiler directly, and preserve behavior rather than redesigning during a framework port.
- **Pi** — small explicit package boundaries and codebase guidance that makes the system easy for humans and coding agents to modify.
- **OpenCode v2** — strict dependency direction, explicit architecture contracts, narrow ownership boundaries, and agent-facing repository instructions.

These projects are references, not bundled source dependencies except for `@gpuix/native` and Solid itself. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Design rules

1. Preserve GPUIX behavior unless a Solid semantic requires a different implementation.
2. Never route Solid updates through React or `react-reconciler`.
3. Native renderer ownership is per root; no module-global active renderer.
4. The JS shadow tree is structural only. Rust remains the native retained rendering source of truth.
5. One synchronous Solid update burst should cross N-API as few times as practical.
6. Native animations remain native. Solid sends targets; Rust owns animation frames.
7. Test behavior at the retained-tree/event boundary, then add screenshot parity against upstream fixtures.
8. Automation attaches to a specific renderer/backend instance; locators do not create a module-global active app.

## Development

The repository uses Bun workspaces.

```bash
bun install
bun run typecheck
bun run test
bun run build
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [AGENTS.md](./AGENTS.md) before making renderer changes. Release contributors should also read [RELEASING.md](./RELEASING.md).

## Credits

GPUix Solid exists because of [remorses/gpuix](https://github.com/remorses/gpuix) and its GPUI bindings. The native bridge, retained-tree design, element model, style/event semantics, and much of the behavioral target originate there.

GPUI itself is developed as part of [Zed](https://github.com/zed-industries/zed). Solid is developed by the [SolidJS](https://github.com/solidjs/solid) project.

This repository is not an official GPUIX, Zed, or SolidJS project.
