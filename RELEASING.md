# Releasing

GPUix Solid releases are prepared and published by GitHub Actions. Normal releases must not be published from a developer workstation.

The release automation in this document currently publishes `gpuix-solid`, the Solid 2 package in `packages/solid`. The maintained Solid 1 renderer, `@jhomra21/gpuix-solid1`, has its own version in `packages/solid1` and is not advanced by a `gpuix-solid` release.

## Release invariants

- `main` is the only source of publishable release bytes.
- Runtime or source changes go through the normal Linux, macOS, and Windows CI matrix before release preparation.
- Release PRs are metadata-only. They change exactly `packages/solid/package.json` and `CHANGELOG.md`.
- The publish workflow builds and packs one sanitized npm artifact, smoke-tests that exact tarball in clean npm, Bun, and Solid TSX/Vite consumers, uploads it as a workflow artifact, then publishes those exact bytes without rebuilding.
- npm registry integrity and the expected `beta` or `latest` dist-tag are verified after publication.
- The Git tag and GitHub Release are created only after npm succeeds.
- Publishes are public and use npm provenance. The sole exception is the one-time manual `gpuix-solid@0.1.0-beta.4` package-name bootstrap, which predates the Trusted Publisher that could only be attached after that package existed.
- A recovery run may accept an already-published version only when npm reports the same SHA-512 integrity as the validated artifact.
- Recovery resolves the main-branch commit that introduced the current package version and keeps the release tag anchored to that commit.
- Never reuse a version whose npm bytes differ or that has already been published with different content.

## Changelog lifecycle

User-facing changes accumulate under `## Unreleased` in `CHANGELOG.md`.

The Prepare Release workflow moves those notes into a dated immutable version section and restores an empty `Unreleased` section for the next cycle. The release tooling is covered by `scripts/release.test.mjs` and supports:

- `beta-next`
- `promote-stable`
- `patch`
- `minor`
- `major`
- `explicit`

For a prerelease such as `0.1.0-rc.1`, `promote-stable` produces `0.1.0`. After a stable release, `patch` advances the patch version, for example `0.1.0` to `0.1.1`.

## Normal release flow

1. Confirm all intended source changes are merged and CI is green on `main`.
2. Add meaningful user-facing notes under `CHANGELOG.md` -> `Unreleased` while developing release-worthy changes.
3. Run Prepare Release from `main`, or use the owner-only Release Control command for the desired release strategy.
4. The workflow creates `release/v<version>` with only the package version and changelog transition, opens a release PR, and explicitly dispatches Release Check.
5. The generated release commit intentionally does not use `[skip ci]` or another GitHub skip marker. `scripts/release.test.mjs` enforces this because a skipped merged-PR event can prevent the publication path from running.
6. Review the version and changelog. Merge only after Release Check is green.
7. The merge creates a push to `main`. Publish Trigger finds the commit that introduced the approved version, verifies that package inputs have not changed afterward, and dispatches Publish Package through `workflow_dispatch`.
8. Publish Package:
   - resolves the approved release source;
   - runs the full release checks;
   - installs the GPUI Linux runtime libraries needed to load `@gpuix/native` in the clean consumer;
   - stages the public package in `packages/solid/.publish`;
   - packs one npm tarball and verifies its npm SHA-512 integrity;
   - performs an npm publish dry-run;
   - installs that exact tarball into clean npm and Bun consumers;
   - typechecks and bundles a clean external Solid TSX/Vite consumer against that exact tarball;
   - uploads the exact tarball plus `pack.json`;
   - downloads and re-verifies those bytes in the publish job;
   - publishes through npm Trusted Publishing/OIDC when the version is new;
   - accepts an existing version only when registry integrity matches exactly;
   - polls npm until registry integrity and the expected dist-tag match;
   - creates `v<version>` only after npm succeeds;
   - creates the GitHub Release last.
9. Run the Release Control `/verify-release` check when an explicit registry-level proof is useful. It validates the current version, dist-tag, SHA-512 integrity, and npm provenance policy. Provenance is required for every release except the exact one-time `gpuix-solid@0.1.0-beta.4` bootstrap.

## Stable 0.1.0 qualification

The Solid 2 stable line had an additional foreground gate because earlier GPUIX 0.8 source analysis found a text-selection mouse-up ownership path that could reproduce a nested root-view update.

The exact published `gpuix-solid@0.1.0-rc.1` and `@gpuix/native@0.8.0` pair passed the external foreground acceptance test on September 15, 2026. The Counter and GPUIX 0.8 text/input applications completed their click, hover, selection, focus, accessibility, multiline textarea, and follow-up interaction paths with no crash or fatal `GpuixView` error.

After publication, stable `gpuix-solid@0.1.0` passed the same external foreground test. That closes the original stable-promotion gate and is recorded in `docs/release-candidate.md`.

A documentation-only patch release does not need to repeat the historical RC promotion sequence. It still goes through the normal release checks and exact-tarball publication flow. If a patch changes renderer behavior, native dependencies, input ownership, or another path covered by the foreground test, run `scripts/test-published-foreground.mjs` against the exact candidate before treating the release as accepted.

## Original scoped-package bootstrap

The original scoped package bootstrap is complete.

`0.1.0-beta.0` was an internal pre-publication candidate and was intentionally never published. `0.1.0-beta.1` was the first public version of `@jhomra21/gpuix-solid`. Because npm requires a package to exist before a GitHub Actions trusted publisher can be configured, beta.1 was published once manually from the same sanitized staged tarball used by the release tooling. Registry integrity was verified against that tarball before Trusted Publishing was configured.

That bootstrap applies only to the original scoped Solid 2 package.

`0.1.0-beta.2` was the first steady-state tokenless release for `@jhomra21/gpuix-solid`. It was published through Trusted Publishing/OIDC and the registry exposed a SLSA provenance v1 attestation for the published package.

## `gpuix-solid` package-name migration bootstrap

The Solid 2 npm package now publishes as `gpuix-solid`. This is a separate npm package identity from the old `@jhomra21/gpuix-solid` package.

Because `v0.1.0-beta.3` already belongs to the original scoped package release, the first unscoped version was `gpuix-solid@0.1.0-beta.4`.

The one-time bootstrap sequence is complete. It created the unscoped package, verified the exact tarball integrity, configured the Trusted Publisher, and returned later releases to the normal tokenless OIDC flow.

The old scoped package remains a separate registry entry and should receive no new releases.

## Trusted Publisher configuration

Normal npm publication is tokenless after the one-time `gpuix-solid` bootstrap. The npm trusted publisher is:

- package: `gpuix-solid`
- repository: `jhomra21/gpuix-solid`
- workflow filename: `publish.yml`
- GitHub environment: `npm-publish`
- allowed action: `npm publish`

The publish job keeps `id-token: write` and uses npm 11.19.0 or newer so npm can exchange the GitHub OIDC identity for a short-lived publish credential.

Do not add `NPM_TOKEN`, `NPM_BOOTSTRAP_TOKEN`, or another long-lived npm publishing token to repository secrets or the workflow.

If the GitHub Environment name changes, update the npm Trusted Publisher to the exact same Environment name before the next release.

## Release Control

Issue #31 is the persistent owner-only control page for release automation. Commands are accepted only on that issue and only from the repository owner.

- `/release beta-next`
- `/release promote-stable`
- `/release patch`
- `/release minor`
- `/release major`
- `/release explicit <version>`
- `/recover-release`
- `/finalize-release`
- `/verify-release`

The `/release` commands prepare a release from `main`. `/recover-release` dispatches the publisher when a release did not reach a terminal state. `/finalize-release` repairs only a missing GitHub Release after validating npm and tag state. `/verify-release` is read-only with respect to npm. It checks the current version, expected dist-tag, registry SHA-512 integrity, and npm provenance policy.

## Manual recovery

Publish Package can also be dispatched manually from `main` when a release merge succeeded but publication, tag creation, or GitHub Release creation did not complete.

Recovery is intentionally strict:

- it finds the main-branch commit that introduced the current version;
- it refuses recovery if publishable runtime inputs changed afterward;
- it requires an immutable changelog section for that version;
- it rebuilds one candidate from the reviewed release source;
- if npm already has the version, the remote `dist.integrity` must match the candidate exactly;
- an existing tag must point to the version-introducing release commit;
- an existing GitHub Release is treated as completed state rather than overwritten.

If runtime or package inputs changed after a version was prepared, prepare a new version instead of attempting recovery.

## Local checks

Before changing release infrastructure, run:

```bash
bun install --frozen-lockfile
bun run release:check
bun run release:test
node packages/solid/scripts/validate-package.mjs
node packages/solid/scripts/smoke-package.mjs
```

On Linux, the smoke test requires the same GPUI runtime libraries installed by CI and upstream GPUIX. The smoke script creates consumer projects outside the repository and removes them when complete.
