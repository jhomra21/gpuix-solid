# 0.1.0 release-candidate acceptance

Status: passed on September 15, 2026.

The stable `gpuix-solid@0.1.0` line is promoted only after an exact registry release candidate passes the repository release checks and real macOS foreground acceptance. This gate applies to the Solid 2 package. Solid 1 remains a separately versioned renderer under `@jhomra21/gpuix-solid1` and continues to run through the normal CI matrix.

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

## Foreground registry gate

The published package pair was:

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

The test consumer, screenshots, and test processes were removed after acceptance. The main working tree was clean.

## What the pass means

The RC pass satisfies the GPUix Solid stable-promotion gate for the Solid 2 package. It proves that the exact published candidate completed the interaction paths that previously reproduced the foreground failure.

It does not claim that the upstream GPUIX source-level ownership concern was removed. Keep that distinction in compatibility notes and future regression tests.
