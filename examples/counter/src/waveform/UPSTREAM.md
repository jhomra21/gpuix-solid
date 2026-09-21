# Upstream

This is the Solid 2 port of GPUIX's official live waveform example.

- Repository: `remorses/gpuix`
- Release: `@gpuix/react@0.10.0`
- Revision: `410fb56f2e599ef49b1dabfc43872b6ff8047916`
- Source: `examples/waveform.tsx`

The port keeps the same 720×96 layout, 2× RGBA backing buffer, live `setImagePixels` update, clip list, and `scrollIntoView` interaction. It uses Solid signals and refs instead of React hooks.
