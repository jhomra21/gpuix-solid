# Release qualification

## 0.2.1 beta and post-beta candidate

Status: `gpuix-solid@0.2.1-beta.0` is the published prerelease baseline for this record; the post-beta fixes below were qualified on September 19, 2026 for a subsequent 0.2.1 prerelease.

The current runtime pair is:

- `gpuix-solid@0.2.1-beta.0` as the published prerelease baseline
- `@gpuix/native@0.9.0`
- `solid-js@2.0.0-rc.8`
- `@solidjs/universal@2.0.0-rc.8`

The published beta passed a clean external consumer: Counter interaction, accessibility actions, textarea newline behavior, and the GPUIX surface built and ran without a fatal native error. That run exposed a production-only integration gap in reactive text selection: the native highlight painted, but `createTextSelection()` remained at `Selection: none`.

The cause was the Solid batch renderer adapter forwarding `getSelectedText()` and `clearSelection()` but not `setWindowSelectionChange()`. PR #98 fixed that capability forwarding in both Solid 2 and Solid 1 and added direct regression coverage.

The exact post-beta candidate was:

```text
ab6436a0744a2907dcbf9325efbc0365e30e5517
```

On that SHA:

- CI passed on macOS, Ubuntu, and Windows;
- package smoke passed for Solid 2 and Solid 1;
- the pinned GPUIX 0.10.0 source-edge lane passed;
- Diffusion deterministic and live-native regressions passed;
- the Solid 1 DAW native regression passed;
- exhaustive Mail live-native acceptance and React/Solid differential parity passed;
- live native selection automation selected “Select this GPUIX 0.9 text”, observed the reactive selection label, cleared it to `Selection: none`, selected it again, and a later action click incremented exactly once;
- the focused `test:gpuix-surface` passed;
- only the known duplicate-font GPUI/CoreText warnings appeared.

### Physical-input limitation

The current 0.9 line still does not have a literal physical foreground mouse/trackpad selection pass from this candidate. CUA could not attach to the Bun-launched native window, so the successful interaction above used GPUIX live native stdio automation.

Do not describe that as a physical foreground gesture. It is strong end-to-end evidence for the production native event/subscription path, while physical foreground input remains a separate manual acceptance item.

---

## Historical 0.1.0 qualification

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
