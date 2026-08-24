# Releasing

The package is published from GitHub Actions. Do not publish from a developer workstation.

## Release invariants

- `main` is the only publishable source ref.
- Every publish runs frozen install, lint, typecheck, tests, and build first.
- Scoped publishes are public.
- The workflow refuses `0.0.0`, duplicate versions, stable versions under the `beta` tag, and prerelease versions under `latest`.
- npm provenance is enabled for every publish.

## Changesets

Create a changeset in the feature PR that should cause a release:

```bash
bun run changeset
```

Inspect pending release intent with:

```bash
bun run changeset:status
```

After release-worthy changesets are merged to `main`, run the **Version Packages** workflow. It runs Changesets, creates a `release/version-*` branch, and opens a version PR. Review that PR normally and merge it only after CI passes.

The workflow uses `@changesets/cli@3.0.1` explicitly through `bunx`, so release versioning does not depend on an unpinned globally installed CLI.

## First npm publication

npm trusted publishing can only be configured after the package exists in the registry. The first publication is therefore a one-time bootstrap:

1. Prepare a prerelease package version in a reviewed PR, for example `0.1.0-beta.0`.
2. Create a short-lived npm granular access token that can publish the package and is allowed to bypass publish 2FA for CI.
3. Add it to this repository as the Actions secret `NPM_BOOTSTRAP_TOKEN`.
4. From `main`, run the **Publish Package** workflow with the `beta` dist-tag.
5. Confirm the published package has npm provenance and points back to this repository/workflow.

The bootstrap workflow still uses GitHub's OIDC identity token and publishes with provenance; the npm token is only the authentication bridge required before trusted publishing can be configured.

## Switch to trusted publishing

Immediately after the first package exists on npm:

1. Open the npm package settings for `@jhomra21/gpuix-solid`.
2. Add a GitHub Actions trusted publisher with:
   - repository: `jhomra21/gpuix-solid`
   - workflow file: `release.yml`
   - allowed action: publish
3. Run one publish through the trusted publisher and verify its provenance.
4. Delete `NPM_BOOTSTRAP_TOKEN` from GitHub Actions secrets.
5. On npm, disallow traditional publish tokens once the trusted publisher is verified.

The npm CLI detects trusted-publishing OIDC before falling back to token authentication, so the same `release.yml` works for both bootstrap and steady state.

## Publishing

Run the **Publish Package** workflow from `main` and choose the dist-tag that matches the package version:

- `beta` requires a prerelease version such as `0.1.0-beta.0`.
- `latest` requires a stable version such as `0.1.0`.

The workflow uses Node 24, npm 11.19.0, Bun 1.3.14, a frozen lockfile, and `npm publish --provenance`.

## Failed publishes

Never reuse a version that reached npm, even if it is later unpublished. Bump the package version and publish a new version instead.
