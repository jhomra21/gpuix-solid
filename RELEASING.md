# Releasing

GPUix Solid releases are prepared and published by GitHub Actions. Normal releases must not be published from a developer workstation.

## Release invariants

- `main` is the only source of publishable release bytes.
- Runtime/source changes go through the normal Linux/macOS/Windows CI matrix before release preparation.
- Release PRs are metadata-only: exactly `packages/solid/package.json` plus `CHANGELOG.md`.
- The publish workflow builds and packs one sanitized npm artifact, smoke-tests that exact tarball in clean npm, Bun, and Solid TSX/Vite consumers, uploads it as a workflow artifact, then publishes those exact bytes without rebuilding.
- npm registry integrity and the expected `beta`/`latest` dist-tag are verified after publication.
- The Git tag and GitHub Release are created only after npm succeeds.
- Publishes are public and use npm provenance.
- A recovery run may accept an already-published version only when npm reports the same SHA-512 integrity as the validated artifact.
- Recovery resolves the main-branch commit that introduced the current package version and keeps the release tag anchored to that commit.
- Never reuse a version whose npm bytes differ or that has already been published with different content.

## Changelog lifecycle

User-facing changes accumulate under `## Unreleased` in `CHANGELOG.md`.

The **Prepare Release** workflow moves those notes into a dated immutable version section and restores an empty `Unreleased` section for the next cycle. The release tooling is covered by `scripts/release.test.mjs` and supports:

- `beta-next`
- `promote-stable`
- `patch`
- `minor`
- `major`
- `explicit`

For a beta such as `0.1.0-beta.1`, `beta-next` produces `0.1.0-beta.2`. Promoting that prerelease produces `0.1.0`.

## Normal release flow

1. Confirm all intended source changes are merged and CI is green on `main`.
2. Add meaningful user-facing notes under `CHANGELOG.md` → `Unreleased` while developing release-worthy changes.
3. Run **Prepare Release** from `main`, or use the owner-only Release Control command for the desired release strategy.
4. The workflow creates `release/v<version>` with only the package version and changelog transition, opens a release PR, and explicitly dispatches **Release Check**.
5. The generated release commit uses `[skip ci]`, so the normal source matrix is not repeated for the metadata-only release PR.
6. Review the version/changelog and merge only after Release Check is green.
7. The merge creates a push to `main`. **Publish Trigger** detects an untagged approved version, verifies package-affecting inputs have not drifted, and dispatches **Publish Package** through `workflow_dispatch`.
8. Publish Package:
   - resolves the approved release source,
   - runs the full release checks,
   - installs the GPUI Linux runtime libraries needed to load `@gpuix/native` in the clean consumer,
   - stages the public package in `packages/solid/.publish`,
   - packs one npm tarball and verifies its npm SHA-512 integrity,
   - performs an npm publish dry-run,
   - installs that exact tarball into clean npm and Bun consumers,
   - typechecks and bundles a clean external Solid TSX/Vite consumer against that exact tarball,
   - uploads the exact tarball plus `pack.json`,
   - downloads and re-verifies those bytes in the publish job,
   - publishes through npm Trusted Publishing/OIDC when the version is new,
   - accepts an existing version only when registry integrity matches exactly,
   - polls npm until registry integrity matches,
   - verifies the expected dist-tag,
   - creates `v<version>` only after npm succeeds,
   - creates the GitHub Release last.
9. Run the Release Control `/verify-release` check when an explicit registry-level proof is useful. It validates the current version, dist-tag, SHA-512 integrity, and npm provenance attestation.

## Original scoped-package bootstrap

The original scoped package bootstrap is complete.

`0.1.0-beta.0` was an internal pre-publication candidate and was intentionally never published. `0.1.0-beta.1` was the first public version of `@jhomra21/gpuix-solid`. Because npm requires a package to exist before a GitHub Actions trusted publisher can be configured, beta.1 was published once manually from the same sanitized staged tarball used by the release tooling. Registry integrity was verified against that tarball before Trusted Publishing was configured.

That bootstrap applies only to the original scoped package.

`0.1.0-beta.2` was the first steady-state tokenless release for `@jhomra21/gpuix-solid`. It was published through Trusted Publishing/OIDC and the registry exposed a SLSA provenance v1 attestation for the published package.

## `gpuix-solid` package-name migration bootstrap

The Solid 2 npm package now publishes as `gpuix-solid`. This is a new npm package identity; npm does not rename or transfer the existing `@jhomra21/gpuix-solid` package in place.

npm requires a package to exist before a Trusted Publisher can be attached to it. Therefore the first `gpuix-solid` release is a one-time new-package bootstrap: publish the exact sanitized tarball produced by this release tooling once using an interactive npm maintainer session, verify its registry SHA-512 integrity against that tarball, then configure `gpuix-solid` with the Trusted Publisher settings below. Do not add an npm token to GitHub Actions for this bootstrap.

After that first `gpuix-solid` publication and trust configuration, all later releases return to the normal tokenless OIDC flow. The old scoped package remains a separate registry entry; deprecating it is a separate explicit maintenance action after the new package is confirmed healthy.

## Trusted Publisher configuration

Normal npm publication is tokenless after the one-time `gpuix-solid` bootstrap. The npm trusted publisher is:

- package: `gpuix-solid`
- repository: `jhomra21/gpuix-solid`
- workflow filename: `publish.yml`
- GitHub environment: `npm-publish`
- allowed action: `npm publish`

The publish job keeps `id-token: write` and uses npm 11.19.0+ so npm can exchange the GitHub OIDC identity for a short-lived publish credential.

Do not add `NPM_TOKEN`, `NPM_BOOTSTRAP_TOKEN`, or another long-lived npm publishing token to repository secrets or the workflow.

If the GitHub Environment name changes, update the npm Trusted Publisher to the exact same Environment name before the next release.

## Release Control

Issue #31 is the persistent owner-only control surface for release automation. Commands are accepted only on that issue and only from the repository owner.

- `/release beta-next`
- `/release promote-stable`
- `/release patch`
- `/release minor`
- `/release major`
- `/release explicit <version>`
- `/recover-release`
- `/finalize-release`
- `/verify-release`

The `/release` commands prepare a release from `main`. `/recover-release` dispatches the hardened publisher when a release did not reach a terminal state. `/finalize-release` repairs only a missing GitHub Release after validating npm and tag state. `/verify-release` is read-only with respect to npm: it checks the current version, expected dist-tag, registry SHA-512 integrity, and npm provenance attestation and reports the result back to issue #31.

## Manual recovery

**Publish Package** can also be dispatched manually from `main` when a release merge succeeded but publication, tag creation, or GitHub Release creation did not complete.

Recovery is intentionally strict:

- it finds the main-branch commit that introduced the current version,
- it refuses recovery if publishable runtime inputs changed afterward,
- it requires an immutable changelog section for that version,
- it rebuilds one candidate from the reviewed release source,
- if npm already has the version, the remote `dist.integrity` must exactly match the candidate,
- an existing tag must point to the version-introducing release commit,
- an existing GitHub Release is treated as completed state rather than overwritten blindly.

If runtime/package inputs changed after a version was prepared, prepare a new version instead of attempting recovery.

## Local checks

Before changing release infrastructure, the useful local gates are:

```bash
bun install --frozen-lockfile
bun run release:check
bun run release:test
node packages/solid/scripts/validate-package.mjs
node packages/solid/scripts/smoke-package.mjs
```

On Linux, the smoke test requires the same GPUI runtime libraries installed by CI/upstream GPUIX. The smoke script creates its consumer projects outside the repository and cleans them when complete.
