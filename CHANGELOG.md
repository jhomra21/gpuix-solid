# Changelog

## Unreleased

<!-- Add user-facing changes here before preparing a release. -->

- Move both renderer packages to the exact `@gpuix/native@0.9.0` contract and pin the source-edge and React Mail parity baselines to the published GPUIX 0.9 source. This carries the upstream native click/selection ownership fix into GPUix Solid and removes the old GPUIX 0.8 foreground selection ownership concern from the current baseline.
- Align the Solid 2 renderer, examples, lockfile, public starter, and clean-consumer qualification on the paired `solid-js@2.0.0-rc.8` / `@solidjs/universal@2.0.0-rc.8` runtime line instead of mixing Solid release candidates.
- Expose GPUIX 0.9 window-level selection changes through the low-level root `onSelectionChange` callback and the Solid-native `createTextSelection()` primitive in both Solid 2 and Solid 1. The primitive returns a reactive accessor, owns the native subscription through the current Solid owner, cleans it up automatically, and can clear the native selection without requiring React-style callback/state mirroring.
- Add canonical Solid 2 `createTextSearch()`, `createWindowSize()`, and `createWindowInsets()` primitives for stateful helpers that allocate reactive state or native/timer ownership. The existing `useTextSearch`, `useWindowSize`, and `useWindowInsets` exports remain as deprecated compatibility aliases; context readers such as `useGpuix()` keep their normal Solid context naming.
- Coalesce duplicate native semantic `click` callbacks delivered for the same retained target within one microtask burst in both Solid renderer hosts, while preserving separate mouse-up activations and real double-click behavior. Regression coverage now distinguishes duplicate native delivery from two actual user activations.
- Correlate delayed native `mouseUp` relay callbacks for one physical release across host turns until the next physical `mouseDown`. This prevents root/target retained carriers from turning one live click into two Solid click activations while preserving separate clicks at identical coordinates and normal double-click behavior in both Solid hosts.
- Add native regression coverage for selection-change subscription leases, selection clearing, real selection drags, and the GPUIX 0.9 live-click panic path. Native selection helpers now deliver resulting Solid updates before returning.
- Rename the focused versioned `gpuix-08` example surface to the version-neutral `gpuix-surface` command/path while keeping its visible documentation tied to the current GPUIX 0.9 baseline, and update the README, package docs, compatibility guides, source ownership, lockfile policy, and published-foreground acceptance harness for the new line.

## 0.1.1 - 2026-09-15

- Refresh the repository and npm package documentation for the stable `gpuix-solid` line, move the public Solid 2 starter from the npm `beta` tag to `^0.1.0`, and align the root quickstart with upstream GPUIX where the Solid integration has a tested equivalent.
- Record the successful external foreground acceptance run against the published stable `gpuix-solid@0.1.0` and `@gpuix/native@0.8.0` pair. This release contains no renderer runtime changes.

## 0.1.0 - 2026-09-15

- Qualify the Solid 2 `0.1.0` line for stable promotion after the exact published `gpuix-solid@0.1.0-rc.1` and `@gpuix/native@0.8.0` pair passed external macOS foreground acceptance with no crash or fatal `GpuixView` error.
- Clarify the supported framework split. `gpuix-solid` is the Solid 2 renderer, while `@jhomra21/gpuix-solid1` is the separately versioned Solid 1 renderer with a `solid-js >=1.9.0 <2` peer range and maintained CI coverage.
- Record the exact React GPUIX 0.8.0 versus Solid Mail differential gate that passed 14 shared native scenarios before stable release preparation.

## 0.1.0-rc.1 - 2026-09-14

- Prepare the 0.1.0 release-candidate line by moving starter/install docs to the npm `beta` channel instead of pinning an older prerelease and by adding a reproducible fresh-registry foreground acceptance harness for the original Counter interaction path plus the GPUIX 0.8 accessibility/textarea/text-decoration surface.
- Reframe the GPUIX 0.8 foreground-input note around the current evidence: the source-level ownership risk remains unresolved, while the actual published beta.7 + native 0.8.0 external-consumer foreground pass succeeded. Stable promotion now requires the same two-app foreground gate against the exact release candidate.

## 0.1.0-beta.7 - 2026-09-14

- No user-facing changes.

## 0.1.0-beta.6 - 2026-09-14

- Raise the native renderer baseline from `@gpuix/native ^0.7.0` to exact `0.8.0` across the Solid 2 and Solid 1 packages, examples, lockfile, source-edge pin, CI fixtures, and release tooling.

## 0.1.0-beta.5 - 2026-09-14

- Fix native click dispatch to avoid a nested `GpuixView` update panic when a button mutates Solid state during a physical pointer event.

## 0.1.0-beta.4 - 2026-09-13

- Publish the first unscoped `gpuix-solid` package and migrate the release automation to npm Trusted Publishing/OIDC.

## 0.1.0-beta.3 - 2026-09-13

- Preserve the original scoped package release history while preparing the unscoped package-name migration.

## 0.1.0-beta.2 - 2026-09-13

- Publish the first tokenless scoped release through npm Trusted Publishing/OIDC with provenance.

## 0.1.0-beta.1 - 2026-09-13

- Publish the first public scoped package release from the sanitized staged tarball.

## 0.1.0-beta.0 - 2026-09-13

- Internal pre-publication candidate; intentionally not published.
