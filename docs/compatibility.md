# Compatibility

GPUix Solid intentionally tracks GPUIX's public native contract instead of vendoring or forking the Rust renderer.

## Validated dependency contract

| Layer | Supported / validated range | Notes |
| --- | --- | --- |
| `gpuix-solid` | current `0.x` line | Solid bindings in this repository |
| `@gpuix/native` | `^0.4.0` | Canonical GPUIX native mutation/rendering contract |
| `solid-js` | `^2.0.0-rc.0` peer | Solid 2 client/universal semantics |
| `@solidjs/universal` | `2.0.0-rc.0` | Renderer implementation dependency |
| Bun | `1.3.14` | Repository install/build/test toolchain |
| TypeScript | `^5.9.2` | Package type/build validation |

The native GPUIX contract is the behavioral baseline. When `@gpuix/native` changes its element, style, event, automation, or motion contract, update parity tests before widening the supported native range.

## Operating systems

`@gpuix/native@0.4.0` publishes native targets for:

- macOS arm64 and x64
- Linux arm64 and x64 GNU
- Windows arm64 and x64 MSVC

GPUix Solid CI runs frozen install, lint, typecheck, platform-independent tests, and builds on one GitHub-hosted runner for each OS family: macOS, Linux, and Windows.

Native `TestGpuixRenderer` coverage is currently validated in CI on macOS and Linux. The Ubuntu runner installs the GPUI runtime libraries required by the published Linux binding, so native event/input, layout, screenshot, animation, retained-tree, and dashboard dogfood coverage execute there instead of being skipped.

The published `@gpuix/native@0.4.0` Windows x64 MSVC binding currently fails to load on GitHub-hosted Windows Server 2025 with `ERR_DLOPEN_FAILED` (`The specified procedure could not be found`). Windows CI therefore remains a lint, typecheck, build, and platform-independent-test gate, while the native dashboard execution is skipped on Windows CI only. This does not disable local Windows attempts; `bun run test` outside CI still tries to load and exercise the native binding.

## Solid 2 conditions

Native Bun/Node execution must resolve Solid's client/browser implementation, not its SSR implementation. The Vitest configuration therefore resolves browser/client conditions and inlines `solid-js` / `@solidjs/universal` for native renderer tests.

## Compatibility policy

- Do not claim support for a new `@gpuix/native` minor until the parity suite passes against it.
- Do not loosen the `solid-js` peer range independently of the `@solidjs/universal` renderer dependency.
- Keep package behavior framework-native: no React compatibility layer and no native Rust fork.
- Release notes should call out any intentional compatibility-range change.
