# 0.1.0 release-candidate acceptance

The stable `0.1.0` line is promoted only after an exact registry release candidate passes both deterministic CI and foreground macOS acceptance.

## Deterministic gates

- frozen install, lint, typecheck, logic tests, and builds
- macOS, Ubuntu, and Windows verification
- Solid 1 package and consumer validation
- exact package tarball smoke
- pinned GPUIX 0.8 source build/link/status/verify/compatibility
- external public starter install/typecheck/build
- published foreground harness `prepare` step against the npm `beta` channel

## Foreground registry gate

After `gpuix-solid@0.1.0-rc.1` is published, run:

```bash
GPUIX_SOLID_VERSION=0.1.0-rc.1 node scripts/test-published-foreground.mjs all
```

The script installs registry packages into the operating system's temporary directory and launches two apps sequentially. Set `GPUIX_FOREGROUND_TMP` only when you intentionally want a different temp root.

### Original Counter reproducer

Confirm:

- immediate paint
- hover `+`
- repeated `+`
- `-`
- number click
- Reset
- text drag-selection and release
- normal close
- no panic, abort, or `GpuixView already being updated`

### GPUIX 0.8 text/input surface

Confirm:

- repeated accessible-action clicks
- textarea typing
- Enter/newline behavior across multiple lines
- keyboard/Tab stability
- decorated-text and textarea selection drag/release
- normal close
- no panic, abort, or `GpuixView already being updated`

The current GPUIX 0.8 source/runtime ownership discrepancy is considered release risk until this exact published-RC foreground gate passes. A successful RC pass is evidence for GPUix Solid stable promotion; it does not by itself claim an upstream GPUIX source fix landed.
