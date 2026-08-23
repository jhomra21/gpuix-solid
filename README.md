# GPUix Solid

Solid 2 bindings for [GPUIX](https://github.com/remorses/gpuix), targeting [GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui), Zed's GPU-accelerated UI framework.

```text
Solid 2 + TypeScript
        │
        ▼
@jhomra21/gpuix-solid
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

Early development. The renderer kernel is being implemented first:

- Solid 2 universal renderer integration
- root-scoped JS shadow host tree
- retained-tree mutation protocol
- batched N-API writes
- event registry and refs
- GPUIX intrinsic JSX types
- root lifecycle and frame loop

Higher-level component parity (`Select`, `Combobox`, `Tooltip`, `motion`) and automation parity follow after the host contract is stable.

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

## Planned usage

```tsx
import { render } from "@jhomra21/gpuix-solid"
import { createSignal } from "solid-js"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div style={{ padding: 24, gap: 12, flexDirection: "column" }}>
      <text>Count: {count()}</text>
      <div onClick={() => setCount(count() + 1)}>
        <text>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, { title: "Solid GPUIX" })
```

See `examples/counter` for the first fixture.

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

## Development

The repository uses Bun workspaces.

```bash
bun install
bun run typecheck
bun run test
bun run build
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [AGENTS.md](./AGENTS.md) before making renderer changes.

## Credits

GPUix Solid exists because of [remorses/gpuix](https://github.com/remorses/gpuix) and its GPUI bindings. The native bridge, retained-tree design, element model, style/event semantics, and much of the behavioral target originate there.

GPUI itself is developed as part of [Zed](https://github.com/zed-industries/zed). Solid is developed by the [SolidJS](https://github.com/solidjs/solid) project.

This repository is not an official GPUIX, Zed, or SolidJS project.
