# Architecture

## Goal

Provide a first-class Solid 2 renderer for GPUIX while preserving the behavior and native protocol of `remorses/gpuix`.

The framework boundary is intentionally above `@gpuix/native`:

```text
                        @gpuix/native
                              │
                      napi retained tree
                              │
                ┌─────────────┴─────────────┐
                │                           │
          @gpuix/react              @jhomra21/gpuix-solid
          React/Fiber                 Solid 2 universal
```

The project is a renderer, not a fork of GPUIX's Rust native layer.

## Dependency direction

Inspired by the explicit dependency rules used in OpenCode v2, runtime dependencies move in one direction:

```text
public API
   │
   ▼
root/runtime lifecycle
   │
   ├── events
   ├── frame loop
   └── universal host adapter
            │
            ▼
       host node model
            │
            ▼
      mutation driver
            │
            ▼
      NativeRenderer contract
            │
            ▼
        @gpuix/native
```

Host primitives do not import higher-level components. Components may depend on the public/root services, never the reverse.

## Two retained representations

There are two intentionally different trees.

### JS shadow host tree

The Solid universal reconciler requires synchronous structural queries:

- parent node
- first child
- next sibling
- insertion before an anchor
- removal

The JS host tree answers those queries without crossing N-API.

It stores only renderer bookkeeping: identity, parent/children order, current props/text, event handlers, and root ownership.

### Rust retained tree

`@gpuix/native` owns the actual native retained UI state consumed by GPUI. Mutations are sent to it through the existing GPUIX protocol.

The JS tree is not a second UI model. It exists so Solid can reconcile synchronously while native operations remain batched.

## Detached nodes and adoption

Solid's universal `createElement(tag)` callback does not receive a parent/root. A node may also be created before insertion.

Therefore new nodes begin detached:

```text
createElement("div")
        │
        ▼
Detached HostElement
  id = unassigned
  root = null
  props stored locally
        │
        │ insert into parent
        ▼
adopt(parent.root)
  allocate numeric id
  enqueue createElement
  enqueue current props/text/events
```

This avoids a module-global "current renderer" and makes multiple roots safe.

A node can be adopted once. Inserting an already-adopted node into another root is an error.

## Root ownership

Each `GpuixRoot` owns:

```text
GpuixRoot
  ├── NativeRenderer
  ├── MutationDriver
  ├── EventRegistry
  ├── IdAllocator
  ├── RootHostNode
  └── Solid disposer
```

No mutable module-global active renderer, event registry, or ID counter is allowed.

This follows the instance-isolation rule used in Mesurer Solid and avoids cross-window/test-root corruption.

## Mutation batching

React GPUIX flushes mutations at the end of Fiber's commit phase. Solid has no Fiber commit phase, so the Solid renderer defines its own flush boundaries.

Every host mutation:

1. updates the JS shadow tree immediately;
2. queues the matching native mutation;
3. schedules one microtask flush if one is not already scheduled.

Additional synchronous boundaries flush explicitly:

- after initial mount;
- after a GPUI event handler returns;
- before native queries that require committed state;
- during `flushSync`;
- during unmount/disposal.

With native `applyBatch`, all queued operations cross N-API in one call.

```text
Solid signal writes
  │  │  │
  └──┴──┴── host mutations
             │
             ▼
        MutationDriver
             │ one microtask
             ▼
          applyBatch
```

If `applyBatch` throws, the queue is retained so callers can observe/retry without silently dropping mutations.

## Events

Event handlers are stored in the root's JS `EventRegistry`, keyed by `(elementId, eventType)`.

Changing a handler while an event type is already enabled only changes the JS closure. Crossing N-API is needed only when the native listener changes between enabled and disabled.

GPUI events are dispatched to the root registry. After the handler runs, the root flushes any synchronous Solid updates caused by that handler.

## Properties

The host adapter owns four prop categories:

1. `children` — handled by Solid universal insertion.
2. `ref` — handled by the Solid compiler/runtime.
3. `style` — forwarded to `setStyle` as structured data.
4. events/custom props — events use the JS registry; everything else forwards through `setCustomProp` according to GPUIX's element rules.

Built-in `div` and `text` custom-prop filtering must stay behaviorally aligned with upstream GPUIX. Universal properties such as focus, automation IDs, and motion remain available across appropriate element types.

## Text nodes

Raw Solid text becomes a native GPUIX `text` element with an allocated ID. `replaceText` becomes `setText`.

This keeps dynamic expressions such as:

```tsx
<text>Count: {count()}</text>
```

fine-grained: only the affected text node is updated.

## Top-level root

GPUIX's native contract has one root element ID. The Solid root therefore supports one native top-level host node, matching normal GPUIX application structure. Components may freely return fragments below that native root.

A future synthetic root may only be added if it can be proven layout-neutral across GPUI and upstream parity tests.

## Native animation

Animation stays in Rust. Solid updates the serialized `motion` target only when reactive state changes. It must never produce per-frame JS signal writes or N-API traffic for a native animation.

## Higher-level components

`Select`, `Combobox`, and `Tooltip` will preserve upstream public behavior but use Solid-native internals.

Do not port React mechanisms such as `Children.toArray`, `cloneElement`, `forwardRef`, or child virtual-element introspection literally. Prefer context, registration, accessors, and explicit slots/render props.

This is the same principle used in previous React-to-Solid work: preserve product behavior and contracts; replace framework mechanisms with idiomatic Solid mechanisms.

## Testing strategy

Testing happens in layers:

1. **Host kernel tests** — JS tree order, adoption, movement, removal, IDs.
2. **Mutation tests** — exact queued operations and batch boundaries.
3. **Event tests** — registration, replacement, removal, dispatch + flush.
4. **Native retained-tree parity** — the same fixture should produce equivalent native trees in React and Solid.
5. **Interaction parity** — input, focus, scroll, selection, virtual-list behavior.
6. **Screenshot parity** — selected upstream fixtures rendered through both bindings.
7. **Automation parity** — locators, screenshots, input, and motion clock.

Do not claim parity based only on TypeScript or unit tests when native behavioral validation is available.
