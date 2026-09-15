# GPUix Solid

Solid bindings for [GPUIX](https://github.com/remorses/gpuix), which targets [GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui), Zed's GPU UI framework.

GPUix Solid supports Solid 1 and Solid 2 through separate renderer packages. Both render native GPUIX trees. Neither package uses React, Electron, or a browser web view.

| Solid version | Package | Solid peer range | Current repository status |
| --- | --- | --- | --- |
| Solid 2 | `gpuix-solid` | `^2.0.0-rc.0` | `0.1.0-rc.1` passed stable-release qualification; `0.1.0` is being prepared |
| Solid 1 | `@jhomra21/gpuix-solid1` | `>=1.9.0 <2` | maintained separately at the version declared in `packages/solid1/package.json`; CI currently exercises Solid 1.9.15 |

Both packages target `@gpuix/native ^0.8.0`.

```text
Solid 2 + TypeScript         Solid 1 + TypeScript
        |                            |
        v                            v
   gpuix-solid              @jhomra21/gpuix-solid1
        |                            |
        +-------------+--------------+
                      |
                      v
               @gpuix/native 0.8
                      |
                      v
                     GPUI
                      |
                      v
          Metal / Vulkan / DirectX
```

## Start with Solid 2

The copyable Solid 2 starter is [`templates/solid2-vite-bun`](./templates/solid2-vite-bun). It lives outside the repository workspaces and installs public packages like a new application.

```bash
cp -R templates/solid2-vite-bun my-gpuix-app
cd my-gpuix-app
bun install
bun run typecheck
bun run build
bun run start
```

The exact published candidate is `gpuix-solid@0.1.0-rc.1`. Until stable `0.1.0` is published, a blank Solid 2 project can install:

```bash
bun add gpuix-solid@0.1.0-rc.1 solid-js@2.0.0-rc.1
bun add -d @solidjs/vite-plugin@3.0.0-next.29 vite@8.1.5 typescript@5.9.2
```

After `0.1.0` is published to npm `latest`, use:

```bash
bun add gpuix-solid solid-js@2.0.0-rc.1
```

See [Build a native Solid 2 app](./docs/getting-started.md) for the TypeScript and Vite configuration, native addon boundary, packaging notes, and debugging.

## Start with Solid 1

Solid 1 uses `@jhomra21/gpuix-solid1`, not `gpuix-solid`. The package declares `solid-js >=1.9.0 <2` and CI currently runs it against `solid-js@1.9.15`.

The Solid 1 renderer has separate runtime code because Solid 1 updates synchronously. It also provides the tested `./web` compatibility entry used by browser-oriented Solid 1 source such as Kobalte.

The maintained Solid 1 examples include the compatibility lab, Kobalte, Tailwind v4, a blurred window, and the DAW.

See [Build a native Solid 1 app](./docs/getting-started-solid1.md) for compiler configuration and the current repository contract.

## How rendering works

Both packages compile Solid JSX through a custom universal renderer into GPUIX's retained native tree.

```text
Solid signal update
        |
        v
Solid computation
        |
        v
JavaScript host-node update
        |
        v
batched native mutations
        |
        v
@gpuix/native applyBatch
        |
        v
Rust retained tree
        |
        v
GPUI frame
```

Solid 1 and Solid 2 use different framework runtimes, but they share the framework-neutral native host contract where possible. CI checks that shared host code for drift.

A native GPUix process still needs Solid's live client reactive runtime. Vite therefore resolves Solid's `browser` condition while compiling JSX with `generate: "universal"`. That condition selects Solid's client reactivity. It does not add a DOM or web view.

## Examples

The repository includes Solid 2 application ports and Solid 1 ecosystem fixtures. Visible output renders through GPUIX.

| Example | Solid version | Run | What it exercises |
| --- | --- | --- | --- |
| GPUIX 0.8 surface | 2 | `bun run example:gpuix-08` | accessibility metadata, focus, textarea input, text decoration |
| Dashboard | 2 | `bun run example:dashboard` | routing, controlled input, lists, dialogs, scrolling |
| CodeImage | 2 | `bun run example:codeimage` | editor layout, controls, themes, native compatibility |
| Chat | 2 | `bun run example:chat` | virtualized history, menus, composer input, selection, scrolling |
| Timeline | 2 | `bun run example:timeline` | pan and zoom, clip editing, snapping, pointer capture |
| Mail | 2 | `bun run example:mail` | source-pinned Mail app, HTTP images, navigation, reader states |
| Kobalte | 1 | `bun run example:solid1-kobalte` | portals, dialogs, menus, focus, keyboard input |
| Tailwind v4 | 1 | `bun run example:solid1-tailwind` | compiled native styles, theme tokens, hover and active states |
| Blurred window | 1 | `bun run example:solid1-blurred-window` | native window behavior through the Solid 1 renderer |
| DAW | 1 | `bun run example:solid1-daw` | tracks, ruler, transport, mixer, effects, native adapters |

See [examples/README.md](./examples/README.md) for the full example matrix and source references.

## GPUIX 0.8 baseline

Both renderer packages consume the published GPUIX 0.8 native contract.

The maintained Solid paths test accessibility metadata, focus and tab metadata, text decoration, controlled text input, pointer input, native images, and the GPUIX event and window contract used by current examples.

An upstream GPUIX feature is not treated as supported by GPUix Solid until the Solid host or compatibility layer exposes it and a runnable check proves the path. See [compatibility.md](./docs/compatibility.md) and [upstream-parity.md](./docs/upstream-parity.md).

## Stable-release qualification

The exact published Solid 2 candidate `gpuix-solid@0.1.0-rc.1` with `@gpuix/native@0.8.0` passed the external macOS foreground acceptance test on September 15, 2026.

The Counter path passed increment, decrement, number click, reset, hover, text selection, and a follow-up click. The GPUIX 0.8 text and input path passed accessibility actions, multiline textarea input, Tab and focus behavior, selection drags, and a follow-up click. Neither process crashed or emitted a fatal `GpuixView` error.

The repository also passed exact React GPUIX 0.8.0 versus Solid Mail differential parity across 14 shared native scenarios before PR #80 merged.

These results satisfy the GPUix Solid `0.1.0` stable-promotion gate. They do not claim that an earlier upstream source-level ownership concern was removed. The diagnostic history remains in [release-candidate.md](./docs/release-candidate.md) and [upstream-parity.md](./docs/upstream-parity.md).

## Packages

### `gpuix-solid`

The Solid 2 renderer. It exports the renderer and JSX runtime, native host components, animation helpers, test renderer helpers, window geometry hooks, text-search helpers, and `gpuix-solid/automation`.

### `@jhomra21/gpuix-solid1`

The Solid 1 renderer. It keeps the Solid 1 runtime boundary separate and provides browser-shaped compatibility entry points used by the maintained Solid 1 fixtures.

### `@gpuix/native`

The upstream GPUIX native package. GPUix Solid consumes it rather than carrying a Rust fork.

## Testing

Repository CI validates macOS, Ubuntu, Windows, the Solid 1 package and consumers, the Solid 2 package tarball, source-pinned examples, and the exact GPUIX 0.8 source compatibility lane.

The Solid 2 package also exports Playwright-like automation:

```ts
import { createTestApp } from "gpuix-solid/automation"
import { createTestRoot } from "gpuix-solid"

const testRoot = createTestRoot()
const app = createTestApp(testRoot.renderer)

await app.getByTestId("save").click()
await app.getByTestId("name").fill("New name")
await app.getByTestId("clip").dragBy(120, 0, { steps: 8 })
await app.getByTestId("history").wheel(0, 240)
```

## Source-pinned application work

Where an example comes from upstream source, the repository records exact source revisions and hashes. Framework, router, network, browser, and package differences belong in compatibility code rather than application rewrites.

Contributors working on source compatibility should read:

- [UPSTREAM.md](./UPSTREAM.md)
- [upstream-parity.md](./docs/upstream-parity.md)
- [gpuix-edge.md](./docs/gpuix-edge.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

## Current scope

GPUix Solid targets GPUIX's native desktop renderer. It does not wrap GPUIX's browser or WebGPU WebAssembly renderer.

The continuously validated native package matrix is macOS arm64, Linux x64 GNU, and Windows x64 MSVC. Platform-specific GPUI window behavior can differ across operating systems.

There is no first-party GPUix Solid application installer or packaging CLI yet.

## Documentation

- [Solid 2 getting started](./docs/getting-started.md)
- [Solid 1 getting started](./docs/getting-started-solid1.md)
- [Solid 2 starter](./templates/solid2-vite-bun)
- [Examples](./examples/README.md)
- [Compatibility](./docs/compatibility.md)
- [Release-candidate acceptance](./docs/release-candidate.md)
- [Upstream parity](./docs/upstream-parity.md)
- [Source-edge workflow](./docs/gpuix-edge.md)
- [Architecture](./ARCHITECTURE.md)
- [Releasing](./RELEASING.md)

## License

MIT. See [LICENSE](./LICENSE) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for source attribution.
