# Releasing

GPUix Solid releases are prepared and published by GitHub Actions. Normal releases must not be published from a developer workstation.

## Release invariants

- `main` is the only source of publishable release bytes.
- Runtime/source changes go through the normal Linux/macOS/Windows CI matrix before release preparation.
- Release PRs are metadata-only: exactly `packages/solid/package.json` plus `CHANGELOG.md`.
- The publish workflow builds and packs one sanitized npm artifact, smoke-tests that exact tarball in clean npm and Bun consumers, uploads it as a workflow artifact, then publishes those exact bytes without rebuilding.
- npm registry integrity and the expected `beta`/`latest` dist-tag are verified after publication.
- The Git tag and GitHub Release are created only after npm succeeds.
- Scoped publishes are public and use npm provenance.
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

For a beta such as `0.1.0-beta.0`, `beta-next` produces `0.1.0-beta.1`. Promoting that prerelease produces `0.1.0`.

## Normal release flow

1. Confirm all intended source changes are merged and CI is green on `main`.
2. Add meaningful user-facing notes under `CHANGELOG.md` → `Unreleased` while developing release-worthy changes.
3. Run **Prepare Release** from `main` and select the release strategy.
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
   - typechecks the public declarations,
   - uploads the exact tarball plus `pack.json`,
   - downloads and re-verifies those bytes in the publish job,
   - publishes through npm Trusted Publishing/OIDC when the version is new,
   - accepts an existing version only when registry integrity matches exactly,
   - polls npm until registry integrity matches,
   - verifies the expected dist-tag,
   - creates `v<version>` only after npm succeeds,
   - creates the GitHub Release last.

## First publication bootstrap

The one-time bootstrap is complete.

`0.1.0-beta.0` was an internal pre-publication candidate and was intentionally never published. `0.1.0-beta.1` was the first public package version. Because npm requires a package to exist before a GitHub Actions trusted publisher can be configured, beta.1 was published once manually from the same sanitized staged tarball used by the release tooling. Registry integrity was verified against that tarball before Trusted Publishing was configured.

That manual bootstrap must not be repeated for later versions.

## Trusted Publisher configuration

Normal npm publication is tokenless. The npm trusted publisher is:

- package: `@jhomra21/gpuix-solid`
- repository: `jhomra21/gpuix-solid`
- workflow filename: `publish.yml`
- GitHub environment: `npm-publish`
- allowed action: `npm publish`

The publish job keeps `id-token: write` and uses npm 11.19.0+ so npm can exchange the GitHub OIDC identity for a short-lived publish credential.

Do not add `NPM_TOKEN`, `NPM_BOOTSTRAP_TOKEN`, or another long-lived npm publishing token to repository secrets or the workflow.

If the GitHub Environment name changes, update the npm Trusted Publisher to the exact same Environment name before the next release.

## Manual recovery

**Publish Package** can be dispatched manually from `main` when a release merge succeeded but publication, tag creation, or GitHub Release creation did not complete.

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
