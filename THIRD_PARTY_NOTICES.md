# Third-party notices and references

## GPUIX

GPUix Solid is based on the public architecture and native mutation contract of:

- Project: GPUIX
- Author/repository owner: remorses
- Source: https://github.com/remorses/gpuix

This repository does not vendor GPUIX's React renderer. It depends on the separately distributed `@gpuix/native` package and implements a Solid renderer independently against that native interface. GPUIX remains the canonical reference for intended host behavior and parity fixtures.

The upstream repository did not expose a root `LICENSE` file when this project was initialized on August 23, 2026. For that reason, source from `@gpuix/react` is not copied into this repository. Where behavior is matched, the implementation is written independently from the documented/native protocol and observable tests.

## CodeImage

The runnable CodeImage Native example adapts the editor composition and visual ideas from:

- Project: CodeImage
- Author: Riccardo Perra
- Source: https://github.com/riccardoperra/codeimage
- Upstream revision consulted: `27b185f18d36f2baec3a8cc5a43e8794586096c3`
- License: MIT

The native example is implemented independently for Solid 2 + GPUIX and does not vendor CodeImage's browser editor, backend, UI kit, styles, or state packages. The upstream copyright and MIT permission notice are reproduced in `examples/counter/src/codeimage/UPSTREAM.md`.

## GPUI / Zed

GPUI is developed in the Zed repository:

https://github.com/zed-industries/zed/tree/main/crates/gpui

GPUI is consumed indirectly through `@gpuix/native`; it is not vendored here.

## Solid

Solid and the Solid universal renderer are developed by SolidJS:

https://github.com/solidjs/solid

The package targets Solid 2 and uses its universal custom-renderer contract.

## Architectural references

The following codebases were consulted for repository and architecture conventions but are not runtime dependencies and are not vendored:

- Pi: https://github.com/earendil-works/pi
- OpenCode: https://github.com/anomalyco/opencode
- Mesurer Solid: https://github.com/jhomra21/mesurer-solid
