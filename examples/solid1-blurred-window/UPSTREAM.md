# Upstream source

This compatibility example is a Solid 1 port of `remorses/gpuix` `examples/blurred-window.tsx`.

- Repository: `remorses/gpuix`
- Source file: `examples/blurred-window.tsx`
- Audited source-main revision: `6b4be86952aa89cfe61bb573740aea33fef5c5c4`
- Source blob: `3797c0ef9fd32646e4c9ad03f5274ab027b4fcb3`
- Local translation: `src/index.tsx`

The local file preserves the official static blurred-window example and uses the native GPUIX macOS blurred-window backdrop. React-to-Solid mechanics and the Solid 1 runtime adapter are the translation boundary; the visible source-owned surface should not be redesigned.

The Solid 2 `example:blurred-window` is intentionally different: it remains the animated name-entry showcase. That exception is recorded explicitly in `examples/counter/upstream/gpuix/source-main-surface-lock.json` rather than being treated as upstream parity.
