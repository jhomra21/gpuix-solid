# Architecture

## Goal

Provide native GPUIX renderers for Solid 1 and Solid 2 while preserving the behavior and native protocol of `remorses/gpuix`.

The framework boundary sits above `@gpuix/native`:

```text
                         @gpuix/native
                               |
                       N-API retained tree
                               |
          +--------------------+--------------------+
          |                    |                    |
    @gpuix/react          gpuix-solid      @jhomra21/gpuix-solid1
    React/Fiber           Solid 2          Solid 1
```

GPUix Solid is a renderer project, not a fork of GPUIX's Rust native layer.

The two Solid packages have separate framework runtime code and peer ranges. They share framework-neutral host behavior where the GPUIX contract is the same. CI checks mirrored host files so those implementations do not drift silently.

## Dependency direction

Runtime dependencies move in one direction:

```text
public API
   |
   v
root and runtime lifecycle
   |
   +-- events
   +-- frame loop
   +-- universal host adapter
            |
            v
       host node model
            |
            v
      mutation driver
            |
            v
      NativeRenderer contract
            |
            v
        @gpuix/native
```

Host code does not import higher-level components. Components may depend on public or root services, never the reverse.

## Two retained representations

Each Solid renderer uses two different trees.

### JavaScript host tree

Solid's universal renderer requires synchronous structural queries for parent, child, sibling, insertion, and removal operations.

The JavaScript host tree answers those queries without crossing N-API. It stores renderer bookkeeping such as identity, parent and child order, current props and text, event handlers, and root ownership.

### Rust retained tree

`@gpuix/native` owns the native retained UI state consumed by GPUI. The mutation driver sends host changes through the existing GPUIX protocol.

The JavaScript tree is not a second UI model. It exists so Solid can reconcile synchronously while native operations remain batched.

## Detached nodes and adoption

Solid's universal `createElement(tag)` callback does not receive a parent or root. A node may be created before insertion.

New nodes therefore begin detached:

```text
createElement("div")
        |
        v
Detached HostElement
  id = unassigned
  root = null
  props stored locally
        |
        | insert into parent
        v
adopt(parent.root)
  allocate numeric id
  enqueue createElement
  enqueue current props/text/events
```

This avoids a module-global current renderer and keeps multiple roots isolated.

A node can be adopted once. Inserting an already-adopted node into another root is an error.

## Root ownership

Each root owns its native renderer, mutation driver, event registry, ID allocator, host root, and framework disposer.

```text
GpuixRoot
  +-- NativeRenderer
  +-- MutationDriver
  +-- EventRegistry
  +-- IdAllocator
  +-- RootHostNode
  +-- Solid disposer
```

No mutable module-global active renderer, event registry, or ID counter is allowed.

## Mutation batching

Both Solid packages update the JavaScript host tree synchronously and send native changes through the mutation driver. Their framework scheduling boundaries differ.

### Solid 2 scheduling

Solid 2 has an explicit renderer flush contract. Host mutations update the JavaScript tree, queue native operations, and schedule a flush. The Solid 2 runtime also flushes at boundaries where committed native state is required, including initial mount, event completion, synchronous queries, `flushSync`, and disposal.

### Solid 1 scheduling

Solid 1 updates synchronously and does not use the Solid 2 `flush()` contract. The Solid 1 adapter flushes GPUI mutations after Solid work and at the native boundaries covered by its package and consumer tests.

Do not move scheduling assumptions from one package into the other without tests that prove the behavior on that framework version.

With native `applyBatch`, queued operations cross N-API in one call.

```text
Solid updates
     |
     v
host mutations
     |
     v
MutationDriver
     |
     v
  applyBatch
```

If `applyBatch` throws, the queue is retained so callers can observe or retry the failure without silently dropping mutations.

## Events

Event handlers live in the root JavaScript `EventRegistry`, keyed by element ID and event type.

Replacing a handler while an event type remains enabled changes the JavaScript closure only. N-API traffic is needed when native listener enablement changes.

GPUI events dispatch into the owning root. The framework adapter flushes synchronous updates according to its Solid version's runtime rules before the interaction is considered complete.

## Properties

The host adapter handles these prop categories:

1. `children`, handled by Solid universal insertion;
2. `ref`, handled by the matching Solid compiler and runtime;
3. `style`, forwarded as structured native style data;
4. events and custom props, with events stored in JavaScript and other supported values forwarded through GPUIX custom props.

Built-in host filtering must stay aligned with the GPUIX contract. Universal properties such as focus metadata, automation IDs, and motion remain available where the native element supports them.

## Text nodes

Raw Solid text becomes a native GPUIX `text` element with an allocated ID. Text replacement becomes a native `setText` mutation.

A dynamic expression such as:

```tsx
<text>Count: {count()}</text>
```

updates the affected text node instead of rebuilding the surrounding subtree.

## Top-level root

GPUIX has one native root element ID. Each Solid root therefore supports one native top-level host node, matching the normal GPUIX application shape. Components may return fragments below that native root.

A synthetic top-level root should only be added if tests prove it does not change GPUI layout or upstream parity.

## Native animation

Animation stays in Rust. Solid updates serialized motion targets when reactive state changes. It should not produce per-frame JavaScript signal writes or N-API traffic for native animation frames.

## Framework-specific components

Framework-specific component implementations should preserve public behavior without copying React mechanisms.

The Solid 2 package has its own component and automation APIs. The Solid 1 package has separate runtime code plus compatibility entries used by maintained Kobalte and browser-oriented fixtures.

Shared behavior belongs in framework-neutral host code when ownership and lifecycle rules are identical. Framework-specific context, scheduling, or component behavior stays in its package.

## Testing strategy

Testing happens at several levels:

1. Host tests cover tree order, adoption, movement, removal, and IDs.
2. Mutation tests cover queued operations and batch boundaries.
3. Event tests cover registration, replacement, removal, dispatch, and framework-specific flush behavior.
4. Native retained-tree parity compares application output against the GPUIX contract.
5. Interaction tests cover input, focus, scroll, selection, virtual lists, and pointer behavior.
6. Screenshot tests cover selected native fixtures.
7. Automation tests cover locators, screenshots, input, and the motion clock.
8. Solid 1 consumer lanes cover Kobalte, Tailwind, the blurred window, and the DAW.
9. Solid 2 lanes cover the public package, source-pinned applications, and React versus Solid Mail differential parity.

Do not claim parity from TypeScript or unit tests alone when native behavioral validation is available.
