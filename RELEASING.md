# Releasing

GPUix Solid releases are prepared and published by GitHub Actions. Do not publish from a developer workstation.

## Release invariants

- `main` is the only source of publishable release bytes.
- Runtime/source changes go through the normal Linux/macOS/Windows CI matrix before release preparation.
- Release PRs are metadata-only: exactly `packages/solid/package.json` plus `CHANGELOG.md`.
- The publish workflow builds and packs one sanitized npm artifact, smoke-tests that exact tarball in clean npm and Bun consumers, uploads it as a workflow artifact, then publishes those exact bytes without rebuilding.
- npm registry integrity and the expected `beta`/`latest` dist-tag are verified after publication.
- The Git tag and GitHub Release are created only after npm succeeds.
- Scoped publishes are public and use npm provenance.
- A recovery run may accept an already-published version only when npm reports the same SHA-512 integrity as the validated artifact.
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
4. The workflow creates `release/v<version>` with only the package version and changelog transition, then opens a release PR.
5. The generated release commit uses `[skip ci]`; the workflow explicitly dispatches **Release Check** instead of repeating the full source matrix for metadata-only changes.
6. Review the version/changelog and merge only after Release Check is green.
7. Merging a `release/v*` PR automatically starts **Publish Package**.
8. Publish Package:
   - resolves the approved release source,
   - runs the full release checks,
   - stages the public package in `packages/solid/.publish`,
   - packs one npm tarball and verifies its npm SHA-512 integrity,
   - performs an npm publish dry-run,
   - installs that exact tarball into clean npm and Bun consumers,
   - typechecks the public declarations,
   - uploads the exact tarball plus `pack.json`,
   - downloads and re-verifies those bytes in the publish job,
   - publishes through npm,
   - polls npm until registry integrity matches,
   - verifies the expected dist-tag,
   - creates `v<version>` only after npm succeeds,
   - creates the GitHub Release last.

## First npm publication

npm trusted publishing can only be configured after the package exists in the registry. The first publication therefore needs a one-time authentication bridge.

The repository already contains the reviewed `0.1.0-beta.0` version from before the hardened release flow was installed. For this one bootstrap release:

1. Merge the release-hardening PR and wait for `main` CI to be green.
2. Create a short-lived npm granular access token that can publish `@jhomra21/gpuix-solid` and is permitted for CI when publish 2FA is enabled.
3. Add it to the repository as the Actions secret `NPM_BOOTSTRAP_TOKEN`.
4. Run **Publish Package** manually from `main`. The recovery path locates the commit that introduced `0.1.0-beta.0`, refuses intervening runtime/package-input changes, and packages the current reviewed release tooling.
5. Confirm npm reports `@jhomra21/gpuix-solid@0.1.0-beta.0`, the `beta` dist-tag points to it, provenance exists, and the registry integrity matches the workflow artifact.

Do not manually run `npm publish` from a workstation.

## Switch to trusted publishing

Immediately after the first package exists on npm:

1. Open the npm package settings for `@jhomra21/gpuix-solid`.
2. Add a GitHub Actions trusted publisher for:
   - repository: `jhomra21/gpuix-solid`
   - workflow file: `publish.yml`
3. Keep the workflow's `id-token: write` permission and npm 11.19.0+ publishing client.
4. Publish the next beta through the normal release PR flow and verify its provenance.
5. Delete `NPM_BOOTSTRAP_TOKEN` from GitHub Actions secrets.
6. On npm, disallow traditional publish tokens after the trusted publisher is proven.

The publish job keeps `NODE_AUTH_TOKEN` only as the bootstrap fallback. npm trusted publishing uses the GitHub OIDC identity when configured.

## Manual recovery

**Publish Package** can be dispatched manually from `main` when a release merge succeeded but publication/tag/release creation did not complete.

Recovery is intentionally strict:

- it finds the main-branch commit that introduced the current version,
- it refuses recovery if publishable runtime inputs changed afterward,
- it rebuilds one candidate from the current reviewed release source,
- if npm already has the version, the remote `dist.integrity` must exactly match the candidate,
- an existing tag must point to the expected release source,
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

The smoke script creates its consumers outside the repository and cleans them when complete.
