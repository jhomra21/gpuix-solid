# Documentation

Repository-wide documentation lives here. Package-specific usage stays with the package that owns it, following the same ownership style used by the Pi and OpenCode repositories: the root is an entry point, packages own package concerns, and repository-wide contracts live in a dedicated documentation area.

## Start here

- [Solid 2 getting started](./getting-started.md)
- [Solid 1 getting started](./getting-started-solid1.md)
- [Compatibility matrix](./compatibility.md)
- [Examples](../examples/README.md)

## Architecture and ownership

- [Architecture](./architecture.md)
- [Roadmap](./roadmap.md)
- [Upstream baseline](./upstream.md)
- [Upstream parity](./upstream-parity.md)
- [GPUIX source-edge workflow](./gpuix-edge.md)
- [solid-gpui parity notes](./solid-gpui-parity.md)

## Validation and release

- [Release qualification](./release-candidate.md)
- [Performance methodology](./performance.md)
- [Releasing](./releasing.md)
- [Mail React/Solid parity](./mail-react-solid-parity.md)

## Ownership map

- `packages/solid`: published Solid 2 renderer and package-owned docs
- `packages/solid1`: separately versioned Solid 1 renderer and package-owned docs
- `examples`: runnable native fixtures and source-pinned application dogfood
- `templates`: copyable public starter projects
- `scripts`: repository validation, source-edge, release, parity, and benchmark tooling
- `tools`: maintained repository tooling that is packaged or configured as source, including `tools/oxlint/anti-slop`
- `experiments`: the legacy Solid 1 compatibility lab only; new maintained runnable coverage belongs in `examples/` or its owning package
- `docs`: repository-wide architecture, compatibility, qualification, and release contracts
- `.github`: CI, acceptance, and release automation

Keep implementation details close to the package or example that owns them. Add repository-wide documentation here rather than creating new top-level Markdown files unless the file is a standard repository entry point such as `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, or `AGENTS.md`.
