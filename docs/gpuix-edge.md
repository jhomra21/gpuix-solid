# GPUIX source-edge development

GPUix Solid supports three native validation modes at the same time:

- **stable** uses the published `@gpuix/native` dependency declared by package manifests and resolved by `bun.lock`; it is the backward-compatibility baseline for a default install;
- **pinned edge** builds the exact GPUIX source commit in `.gpuix/edge.json` and temporarily links that local `packages/native` build into installed `@gpuix/native` locations;
- **latest main** resolves the configured upstream branch at run time, builds that source, links it, and runs the same edge checks without waiting for a native npm release.

This keeps the ownership boundary the same as the intended future GPUIX monorepo layout: Solid code stays in the Solid packages, native Rust work stays in GPUIX, and development can consume and validate upstream source changes as soon as they land on `main`.

A published native release is therefore not a blocker for source-edge development or acceptance. The published dependency remains useful as a compatibility baseline and still controls what a plain npm install resolves by default.

## Pin

`.gpuix/edge.json` is the reproducible edge baseline. It records the source repository, full commit SHA, and branch used when checking the current upstream tip.

The repository can be changed to a fork without changing Solid code. For example, a native patch can live temporarily on `jhomra21/gpuix`, with `GPUIX_EDGE_REPOSITORY` and `GPUIX_EDGE_SHA` pointing validation at that patch commit. Once the patch is merged upstream, move the committed pin back to the corresponding `remorses/gpuix` commit.

Environment overrides:

- `GPUIX_EDGE_REPOSITORY=owner/repo`
- `GPUIX_EDGE_SHA=<40-character commit>`
- `GPUIX_EDGE_BRANCH=<branch>`
- `GPUIX_EDGE_CACHE_DIR=<path>`

## Commands

From the repository root, the reproducible pinned edge is:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare
bun run gpuix:edge:status
bun run gpuix:edge:check
```

To resolve and test whatever is on the configured upstream branch right now:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:latest:check
```

`gpuix:edge:latest:check` resolves the current branch tip once, exports that exact SHA for the whole run, builds and links its native package, prints the resolved status, and runs the complete edge verification. `gpuix:edge:latest:prepare` performs only the resolve/build/link/status portion.

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

Ordinary CI continues to guard compatibility with the declared published native dependency.

The pinned edge job is the reproducible forward-compatibility gate. It builds `.gpuix/edge.json` and runs Solid 2, live stdio automation, and the Solid 1 package against that exact GPUIX source.

The separate scheduled/manual latest-main workflow runs the same `gpuix:edge:latest:check` command available locally. It resolves the configured `main` branch at run time, then source-builds and validates that exact tip. A failure there means upstream moved ahead of the committed compatibility pin; it does not rewrite the pin automatically.

When a needed native fix exists on GPUIX `main` but is not published yet, validate it through pinned/latest source edge and continue development from that evidence. There is no need to carry a duplicate Rust workaround in this repository merely to wait for npm publication.

## Native changes

Do not copy GPUIX Rust into this repository to unblock edge work. If a required capability belongs in native:

1. make the change in a GPUIX branch/fork;
2. point the edge repository/SHA at that commit;
3. implement and validate the Solid side against the source-built native package;
4. upstream the native change;
5. move the edge pin to the merged upstream commit.

When Solid eventually moves beside `packages/react` and `packages/native` in the GPUIX monorepo, this source-edge layer can disappear and `@gpuix/native` can become a normal workspace dependency.
