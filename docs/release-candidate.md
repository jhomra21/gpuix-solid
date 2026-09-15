# 0.1.0 release qualification

Status: passed and released on September 15, 2026.

This document records the qualification path for the Solid 2 `gpuix-solid@0.1.0` stable release. Solid 1 remains a separately versioned renderer under `@jhomra21/gpuix-solid1` and continues through the normal CI matrix.

## Deterministic gates

The release-candidate line passed the maintained repository checks, including:

- frozen install, lint, typecheck, logic tests, and builds
- macOS, Ubuntu, and Windows verification
- Solid 1 package and consumer validation
- exact Solid 2 package tarball smoke
- pinned GPUIX 0.8 source build and compatibility checks
- external public starter install, typecheck, and build
- exhaustive native Mail acceptance
- exact React GPUIX 0.8.0 versus Solid Mail differential parity

The final Mail differential passed all 14 shared React scenarios and all 14 Solid scenarios on the same candidate head before PR #80 merged.

## Release-candidate foreground gate

The published qualification pair was:

- `gpuix-solid@0.1.0-rc.1`
- `@gpuix/native@0.8.0`

The acceptance command was:

```bash
GPUIX_SOLID_VERSION=0.1.0-rc.1 node scripts/test-published-foreground.mjs all
```

The script installed registry packages into a fresh external consumer and launched two native applications sequentially.

### Counter result

The following paths passed:

- increment and decrement
- number click
- reset
- hover
- text selection drag and release
- a follow-up click after selection
- normal process shutdown

### GPUIX 0.8 text and input result

The following paths passed:

- accessibility action
- textarea typing across multiple lines
- Enter and newline behavior
- Tab and focus behavior
- decorated-text and textarea selection drags
- a follow-up click after selection
- normal process shutdown

Neither process emitted a native panic, abort, or fatal `GpuixView` update error. The only process output was two duplicate-font warnings from GPUI/CoreText.

## Stable registry confirmation

After `gpuix-solid@0.1.0` was published to npm `latest`, the same external foreground test passed against the stable package and `@gpuix/native@0.8.0`.

The stable command was:

```bash
GPUIX_SOLID_VERSION=0.1.0 node scripts/test-published-foreground.mjs all
```

The Counter path again passed increment, decrement, number click, reset, hover, selection drag, and a follow-up click. The GPUIX 0.8 path again passed accessibility actions, multiline textarea input, Tab and focus behavior, selection drags, and a follow-up click. Neither process crashed or emitted a fatal `GpuixView` error.

Temporary consumers, screenshots, and processes were removed after both acceptance runs.

## What the pass means

The RC pass satisfied the promotion gate, and the stable rerun confirmed the published `0.1.0` package completed the same foreground interaction paths outside the monorepo.

This does not claim that the earlier upstream GPUIX source-level ownership concern was removed. Keep that distinction in compatibility notes and future regression tests.
