# GPUIX source-edge development

GPUix Solid supports two native baselines at the same time:

- **stable** uses the published `@gpuix/native` dependency declared by every package manifest and resolved by `bun.lock`;
- **edge** builds an exact GPUIX source commit and temporarily links that local `packages/native` build into installed `@gpuix/native` locations.

This keeps the ownership boundary the same as the intended future GPUIX monorepo layout: Solid code stays in the Solid packages, native Rust work stays in GPUIX, and the development environment can validate both before a native npm release exists.

## Pin

`.gpuix/edge.json` is the reproducible edge baseline. It records the source repository, full commit SHA, and branch used when checking the current upstream tip.

The repository can be changed to a fork without changing Solid code. For example, a native patch can live temporarily on `jhomra21/gpuix`, with `GPUIX_EDGE_REPOSITORY` and `GPUIX_EDGE_SHA` pointing validation at that patch commit. Once the patch is merged upstream, move the committed pin back to the corresponding `remorses/gpuix` commit.

Environment overrides:

- `GPUIX_EDGE_REPOSITORY=owner/repo`
- `GPUIX_EDGE_SHA=<40-character commit>`
- `GPUIX_EDGE_BRANCH=<branch>`
- `GPUIX_EDGE_CACHE_DIR=<path>`

## Commands

From the repository root:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare
bun run gpuix:edge:status
bun run gpuix:edge:check
```

`gpuix:edge:prepare` performs three explicit steps:

1. fetch the exact source commit and its submodules into `.cache/gpuix/`;
2. install the GPUIX workspace and build `packages/native` locally;
3. replace installed `@gpuix/native` entries with links to that source-built package.

The individual commands are also available:

```bash
bun run gpuix:edge:sync
bun run gpuix:edge:build
bun run gpuix:edge:link
bun run gpuix:edge:status
bun run gpuix:edge:tip
```

`gpuix:edge:tip` prints the current commit at the configured repository/branch. It does not change the committed pin.

The edge links only mutate local `node_modules`. They do not change package manifests, the lockfile, or release metadata. A normal `bun install --frozen-lockfile` restores the root workspace to the published dependency. Isolated Solid 1 fixtures can similarly be restored by reinstalling their local dependencies.

## CI model

The ordinary CI and release jobs remain the authority for the published native dependency.

The pinned edge job builds `.gpuix/edge.json` and runs Solid 2 plus the Solid 1 package against that exact native source. This answers whether the repository is ready for the next native release without making CI depend on a moving branch.

A separate scheduled/manual latest-main workflow resolves the configured `main` branch at run time and runs the same edge checks with `GPUIX_EDGE_SHA` overridden. A failure there means upstream moved ahead of the committed compatibility pin; it does not rewrite the pin automatically.

## Native changes

Do not copy GPUIX Rust into this repository to unblock edge work. If a required capability belongs in native:

1. make the change in a GPUIX branch/fork;
2. point the edge repository/SHA at that commit;
3. implement and validate the Solid side against the source-built native package;
4. upstream the native change;
5. move the edge pin to the merged upstream commit.

When Solid eventually moves beside `packages/react` and `packages/native` in the GPUIX monorepo, this source-edge layer can disappear and `@gpuix/native` can become a normal workspace dependency.
