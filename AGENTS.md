# AGENTS.md: GPUix Solid

Read `README.md` and `docs/architecture.md` before editing either renderer.

## Mission

Build idiomatic Solid 1 and Solid 2 bindings for GPUIX while preserving the native behavior and design intent of `remorses/gpuix`.

The project uses separate framework packages over a shared native contract:

- `gpuix-solid` targets Solid 2;
- `@jhomra21/gpuix-solid1` targets Solid 1.9.x.

This is a framework port, not a redesign of GPUIX.

## Pre-launch evolution

This project has not launched and has no production users or production data. Revisit this policy before the first production deployment.

- Prefer the smallest coherent design that represents the project today.
- Remove obsolete code, schemas, APIs, configuration, aliases, and transitional paths directly.
- Do not add backward-compatibility shims, legacy aliases, dual-read or dual-write paths, or data-preserving backfills unless the user explicitly asks for them.
- Internal interfaces are not public compatibility contracts. Update their callers and tests together when they change.
- Development and test data are disposable. Recreate them instead of complicating the product to preserve local data.
- Keep database invariants, transactional safety, migration idempotence, and deterministic setup intact.
- Consolidate a migration baseline only as an explicit coordinated change.

## Reference Codebases

Use references in this order when a behavior or architecture question arises:

1. `remorses/gpuix` for GPUIX host and native behavior.
2. The matching Solid universal renderer contract for the package being edited.
3. `packages/solid/src/host` and `packages/solid1/src/host` for the shared host behavior that CI keeps in parity.
4. `jhomra21/mesurer-solid` for prior Solid 2 isolation and renderer conventions where they still apply.
5. Pi and OpenCode v2 for repository organization and ownership boundaries.

Do not copy React implementation mechanisms merely because upstream uses them. Preserve visible behavior and the native protocol.

## Repository ownership

Keep top-level ownership narrow:

- published renderers live in `packages/`;
- runnable fixtures live in `examples/`;
- copyable starters live in `templates/`;
- repository automation and command scripts live in `scripts/`;
- maintained tooling source lives in `tools/`, including the custom oxlint anti-slop plugin;
- repository-wide architecture, compatibility, qualification, and release docs live in `docs/`.

Keep package-specific implementation notes with the package that owns them. Do not create new top-level project documents when an existing ownership bucket fits.

## Dependency direction

Keep runtime dependencies flowing downward:

```text
components / public API
          |
          v
runtime + context
          |
          v
universal host adapter
          |
          v
host nodes + events
          |
          v
mutation driver
          |
          v
NativeRenderer / @gpuix/native
```

Lower layers must not import higher layers.

## Renderer invariants

- Do not add `react`, `react-dom`, or `react-reconciler` to either Solid renderer path.
- Do not use a module-global mutable active renderer, root, event map, or element ID counter.
- A host node belongs to at most one root for its lifetime.
- Update JavaScript parent and child order synchronously before native flush.
- Batch native mutations whenever `applyBatch` is available.
- Keep event closures in JavaScript. Rust stores listener enablement only.
- Keep native animations in the native renderer.
- Root disposal is synchronous from the caller's perspective and flushes destruction.
- Cross-root insertion throws instead of silently reparenting native IDs.
- Do not query native state to answer Solid's structural reconciliation methods.

## Solid rules

Use the universal compiler and runtime rather than DOM emulation.

For Solid 2 work, use `gpuix-solid`, `@solidjs/universal`, and the Solid 2 scheduling contract already covered by the package tests.

For Solid 1 work, use `@jhomra21/gpuix-solid1`, `solid-js >=1.9.0 <2`, and its synchronous update model. Do not copy Solid 2 scheduling assumptions into the Solid 1 package.

Keep framework-neutral host changes aligned across both packages when the native contract is shared. Run `scripts/check-host-parity.ts` after shared host edits.

Avoid React-shaped ports:

- no `forwardRef` compatibility abstraction;
- no `cloneElement` architecture;
- no React-style child introspection as state discovery;
- no hook naming solely for React familiarity when a normal Solid primitive is clearer.

Refs are ordinary Solid refs. Controlled and uncontrolled components should use Solid accessors and signals.

## Style

- Prefer `const`.
- Avoid `any`.
- Keep helpers close to their use.
- Do not extract a single-use helper unless it names a real boundary.
- Use early returns instead of unnecessary `else` branches.
- Add comments for non-obvious invariants, not obvious assignments.
- Test the implementation rather than copying it into tests.

This repository does not ban loops or destructuring. Use the clearest TypeScript for renderer algorithms.

## Public API parity

Preserve GPUIX names where they are framework-neutral:

- host element names;
- style keys;
- native custom props;
- event names and payloads;
- `render`, `createRoot`, and `createRenderer` concepts;
- frame-loop and window behavior;
- native automation vocabulary.

Framework-specific names may use idiomatic Solid equivalents, but package differences must be documented.

## Upstream attribution and source use

Keep attribution to `remorses/gpuix` in `README.md` and `THIRD_PARTY_NOTICES.md`.

Do not paste unlicensed upstream implementation source into this repository. Implement against documented contracts, native APIs, tests, and source that the repository is allowed to carry.

## Tests required for host changes

For changes to host nodes, events, mutation batching, or root lifecycle, add or update tests that cover:

- initial mount;
- reactive property and text updates;
- insertion and reorder;
- removal and subtree destruction;
- event handler add, change, and removal;
- multiple roots;
- cleanup and unmount;
- batch failure behavior when relevant.

Run the applicable Solid 1 and Solid 2 lanes when a shared native host behavior changes. Use native parity tests whenever they can exercise the behavior.

## Package management

Use Bun for repository commands and workspaces.

Keep the Solid 1 and Solid 2 dependency ranges separate. Upgrade either framework line only after its package and consumer tests pass. Do not widen one package's peer range because the other package moved.

## Commits

Use conventional commit-style messages such as:

- `feat(renderer): add Solid host tree`
- `fix(events): flush signal updates after dispatch`
- `test(renderer): cover cross-root adoption`
- `docs: explain native batch boundary`
