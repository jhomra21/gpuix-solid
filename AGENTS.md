# AGENTS.md — GPUix Solid

Read `README.md` and `ARCHITECTURE.md` before editing the renderer.

## Mission

Build idiomatic Solid 2 bindings for GPUIX while preserving the native behavior and design intent of `remorses/gpuix`.

This is a framework port, not a redesign of GPUIX.

## Pre-launch Evolution
This project has not launched and has no production users or production data. Revisit this policy before the first production deployment:
- Optimize for the smallest coherent design that represents the product today.
- Remove obsolete code, schemas, APIs, configuration, aliases, and transitional paths directly.
- Do not add backward-compatibility shims, legacy aliases, dual-read or dual-write paths, or data-preserving backfills unless the user explicitly asks for them.
- Internal interfaces are not public compatibility contracts. Update their callers and tests atomically when they change.
- Development and test data are disposable. Prefer recreating those databases over complicating the product to preserve local data.
- Treat migration history as a replaceable development baseline, but keep the checked-in migration chain and setup workflow coherent. Do not rewrite an already-applied migration without also resetting affected development and test databases.
- Preserve database invariants, transactional safety, migration idempotence, and deterministic setup. These are correctness properties, not backward-compatibility requirements.
- Consolidate the migration baseline only as an explicit, coordinated change rather than as incidental work in a feature branch.

## Canonical references

Use references in this order when a behavior or architecture question arises:

1. `remorses/gpuix` — canonical GPUIX host/native behavior.
2. Solid 2 universal renderer — canonical Solid custom-renderer semantics.
3. `jhomra21/mesurer-solid` — prior project conventions for Solid 2 ports, isolation, and framework boundaries.
4. Pi and OpenCode v2 — repository organization, ownership boundaries, extensibility, and agent-facing codebase practices.

Do not copy React implementation mechanisms merely because upstream uses them. Preserve externally visible behavior and native protocol instead.

## Dependency direction

Keep runtime dependencies flowing downward:

```text
components / public API
          ↓
runtime + context
          ↓
universal host adapter
          ↓
host nodes + events
          ↓
mutation driver
          ↓
NativeRenderer / @gpuix/native
```

Lower layers must not import higher layers.

## Renderer invariants

- No `react`, `react-dom`, or `react-reconciler` dependency.
- No module-global mutable active renderer, root, event map, or element ID counter.
- A host node belongs to at most one root for its lifetime.
- JS parent/child order is updated synchronously before native flush.
- Native mutations are batched whenever `applyBatch` is available.
- Event closures stay in JS; Rust stores only listener enablement.
- Native animations stay native.
- Root disposal is synchronous from the caller's perspective and flushes destruction.
- Cross-root insertion throws instead of silently reparenting native IDs.
- Do not query native state to answer Solid's structural reconciliation methods.

## Solid rules

Target Solid 2.

Use the universal compiler/runtime rather than DOM emulation. Components should use signals, accessors, context, cleanup, and registration patterns directly.

Avoid React-shaped ports:

- no `forwardRef` compatibility abstraction;
- no `cloneElement` architecture;
- no React-style child introspection as state discovery;
- no hook naming solely for React familiarity when a normal Solid primitive reads better.

Refs are ordinary Solid refs. Controlled/uncontrolled components should be implemented with accessors and signals.

## Style

Borrow the useful parts of the current OpenCode v2 style guide:

- prefer `const`;
- avoid `any`;
- keep helpers close to their use;
- do not extract single-use helpers unless they name a real boundary;
- use early returns instead of unnecessary `else` branches;
- add comments for non-obvious invariants, not obvious assignments;
- test the actual implementation rather than duplicating it in tests.

Unlike OpenCode, this repo does not prohibit all loops or destructuring. Use the clearest TypeScript for renderer algorithms.

## Public API parity

Preserve GPUIX names where they are framework-neutral:

- host element names;
- style keys;
- native custom props;
- event names/payloads;
- `render`, `createRoot`, `createRenderer` concepts;
- frame-loop/window behavior;
- native automation vocabulary.

Framework-specific names may become idiomatic Solid equivalents, but compatibility differences must be documented.

## Upstream attribution and source use

Keep attribution to `remorses/gpuix` in README and `THIRD_PARTY_NOTICES.md`.

The upstream repository had no root LICENSE file when this project was initialized. Do not paste source from `packages/react` into this repository. Implement against documented contracts, native APIs, tests, and observed behavior. If upstream later publishes an explicit license, reassess what can be shared or ported directly.

## Tests required for host changes

For changes to host nodes, events, mutation batching, or root lifecycle, add/update tests that cover:

- initial mount;
- reactive property/text update;
- insertion and reorder;
- removal and subtree destruction;
- event handler add/change/remove;
- multiple roots;
- cleanup/unmount;
- batch failure behavior when relevant.

When native parity infrastructure lands, run it for every host-protocol change.

## Package management

Use Bun for repository commands and workspaces. Keep versions aligned with the Solid 2 toolchain already proven in `mesurer-solid` unless a deliberate upgrade is validated.

## Commits

Use conventional commit-style messages such as:

- `feat(renderer): add Solid host tree`
- `fix(events): flush signal updates after dispatch`
- `test(renderer): cover cross-root adoption`
- `docs: explain native batch boundary`
