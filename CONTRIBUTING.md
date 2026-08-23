# Contributing

GPUix Solid is early-stage and prioritizes behavioral parity with GPUIX over API expansion.

Before changing renderer internals, read:

- `README.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `UPSTREAM.md`

## Development

Use Bun:

```bash
bun install
bun run typecheck
bun run test
bun run build
```

## Changes to the host protocol

A change to host nodes, prop forwarding, event dispatch, batching, root lifecycle, or native calls must include tests for the affected behavior.

If a change intentionally differs from `@gpuix/react`, explain why the difference is required by Solid semantics and document the public behavior.

## Source attribution

Do not copy source from `remorses/gpuix/packages/react` while the upstream repository does not publish an explicit root license. Use its public APIs, docs, tests, and observable behavior as the specification and implement the Solid mechanism independently.

## Pull requests

Keep PRs focused. Conventional titles are preferred:

```text
feat(renderer): add reactive text updates
fix(events): remove stale handler on disposal
test(native): add retained-tree parity fixture
docs: document Solid batch boundary
```
