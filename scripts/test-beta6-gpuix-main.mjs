import { spawnSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const nativeSha = "8d3ec094387152558d05a5b37de3cfbfca5d2d0a"
const nativeVersion = "0.8.0"
const candidateVersion = "0.1.0-beta.6.edge.8d3ec09"
const nativeCheckout = join(repoRoot, ".cache", "gpuix", `remorses--gpuix-${nativeSha.slice(0, 12)}`)
const nativePackage = join(nativeCheckout, "packages", "native")
const solidPackage = join(repoRoot, "packages", "solid")
const publishDir = join(solidPackage, ".publish")
const consumerDir = "/private/tmp/gpuix-solid-beta6-gpuix-main"
const command = process.argv[2] ?? "all"

const rendererBefore = `                    move |position, app| {
                        drag_move_view
                            .update(app, |view, cx| view.on_selection_mouse_move(position, cx))
                            .ok();
                    },
                    move |app| {
                        drag_end_view
                            .update(app, |view, _cx| view.stop_selection_scroll())
                            .ok();
                    },`

const rendererAfter = `                    move |position, app| {
                        let drag_move_view = drag_move_view.clone();
                        app.defer(move |app| {
                            drag_move_view
                                .update(app, |view, cx| view.on_selection_mouse_move(position, cx))
                                .ok();
                        });
                    },
                    move |app| {
                        let drag_end_view = drag_end_view.clone();
                        app.defer(move |app| {
                            drag_end_view
                                .update(app, |view, _cx| view.stop_selection_scroll())
                                .ok();
                        });
                    },`

const paintBefore = `        let mut selection = up_selection.lock();
        selection.cancel_pending();
        selection.end_active_drag();
        drop(selection);
        on_drag_end(cx);`

const paintAfter = `        let mut selection = up_selection.lock();
        let was_dragging = selection.is_dragging();
        selection.cancel_pending();
        selection.end_active_drag();
        drop(selection);
        if was_dragging {
            on_drag_end(cx);
        }`

switch (command) {
  case "prepare":
    preparePatchedEdge()
    break
  case "check":
    preparePatchedEdge()
    run("bun", ["run", "gpuix:edge:check"], repoRoot)
    break
  case "run":
    runForegroundConsumer()
    break
  case "all":
    preparePatchedEdge()
    run("bun", ["run", "gpuix:edge:check"], repoRoot)
    normalizeGeneratedNativeDeclaration()
    runForegroundConsumer()
    break
  case "status":
    printStatus()
    break
  case "cleanup":
    cleanup()
    break
  default:
    throw new Error(`Unknown command ${JSON.stringify(command)}. Use all, prepare, check, run, status, or cleanup.`)
}

function preparePatchedEdge() {
  run("bun", ["install", "--frozen-lockfile"], repoRoot)
  runEdge("sync")
  applyNativePatch()
  run("git", ["diff", "--check"], nativeCheckout)

  assertExactSourcePatch()

  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  if (head !== nativeSha) {
    throw new Error(`Patched checkout HEAD is ${head}; expected ${nativeSha}`)
  }

  const manifest = readJson(join(nativePackage, "package.json"))
  if (manifest.name !== "@gpuix/native" || manifest.version !== nativeVersion) {
    throw new Error(`Expected @gpuix/native@${nativeVersion} source, got ${manifest.name}@${manifest.version}`)
  }

  runEdge("build")
  runEdge("link")
  console.log(`Prepared GPUIX main candidate: remorses/gpuix@${nativeSha}`)
  console.log(`Source package: @gpuix/native@${nativeVersion}`)
  console.log("Overlay: only the foreground selection ownership patch proven against native 0.7.0")
}

function applyNativePatch() {
  replaceExactlyOnce(
    join(nativePackage, "src", "renderer.rs"),
    rendererBefore,
    rendererAfter,
  )
  replaceExactlyOnce(
    join(nativePackage, "src", "text", "paint.rs"),
    paintBefore,
    paintAfter,
  )
}

function replaceExactlyOnce(path, before, after) {
  const source = readFileSync(path, "utf8")
  const first = source.indexOf(before)
  const second = first === -1 ? -1 : source.indexOf(before, first + before.length)
  if (first === -1 || second !== -1) {
    throw new Error([
      `Expected exactly one native patch target in ${path}; first=${first}, second=${second}.`,
      "GPUIX main changed; do not guess or broaden the patch. Refresh this candidate against the new source first.",
    ].join("\n"))
  }
  writeFileSync(path, `${source.slice(0, first)}${after}${source.slice(first + before.length)}`)
}

function runForegroundConsumer() {
  normalizeGeneratedNativeDeclaration()
  requirePatchedNative()

  let tarballPath
  try {
    run("bun", ["run", "--filter", "gpuix-solid", "build"], repoRoot)
    run("node", ["scripts/stage-package.mjs"], solidPackage)
    stampCandidateVersion()

    const tarballName = capture("npm", ["pack", ".publish", "--silent"], solidPackage)
      .split("\n")
      .filter(Boolean)
      .at(-1)
    if (!tarballName?.endsWith(".tgz")) {
      throw new Error(`npm pack did not return a tarball name: ${JSON.stringify(tarballName)}`)
    }
    tarballPath = join(solidPackage, tarballName)

    resetConsumer()
    run("bun", [
      "add",
      tarballPath,
      "solid-js@2.0.0-rc.1",
      "vite@8.1.5",
      "@solidjs/vite-plugin@3.0.0-next.29",
    ], consumerDir)

    const installedNative = join(consumerDir, "node_modules", "@gpuix", "native")
    rmSync(installedNative, { recursive: true, force: true })
    mkdirSync(join(consumerDir, "node_modules", "@gpuix"), { recursive: true })
    symlinkSync(nativePackage, installedNative, process.platform === "win32" ? "junction" : "dir")

    const nativeManifest = readJson(join(nativePackage, "package.json"))
    const solidManifest = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
    const resolvedNative = realpathSync(installedNative)
    const expectedNative = realpathSync(nativePackage)

    if (solidManifest.version !== candidateVersion) {
      throw new Error(`Expected edge beta ${candidateVersion}, got ${solidManifest.version}`)
    }
    if (nativeManifest.version !== nativeVersion) {
      throw new Error(`Expected GPUIX main native ${nativeVersion}, got ${nativeManifest.version}`)
    }
    if (resolvedNative !== expectedNative) {
      throw new Error(`External consumer native resolves to ${resolvedNative}; expected ${expectedNative}`)
    }

    console.log(`External Solid candidate: gpuix-solid@${solidManifest.version}`)
    console.log(`External GPUIX source: @gpuix/native@${nativeManifest.version} (${nativeSha})`)
    console.log(`Patched native path: ${resolvedNative}`)
    console.log("The disposable consumer uses exact GPUIX 0.8.0 source plus only the proven ownership overlay; nothing from this candidate is published.")
    console.log("Building foreground Counter...")
    run("bun", ["x", "vite", "build"], consumerDir)

    console.log("\nForeground gate:")
    console.log("1. Confirm initial paint")
    console.log("2. Hover +")
    console.log("3. Click + once, then repeatedly")
    console.log("4. Click -")
    console.log("5. Click the number")
    console.log("6. Reset")
    console.log("7. Drag-select some text, then release")
    console.log("8. Exercise any post-0.7 GPUIX behavior you specifically want to inspect")
    console.log("9. Close the window normally")
    console.log("")

    const result = spawnSync("bun", ["dist/counter/index.js"], {
      cwd: consumerDir,
      stdio: "inherit",
      env: process.env,
    })
    if (result.error) throw result.error
    if (result.signal) {
      throw new Error(`Foreground Counter terminated by ${result.signal}`)
    }
    if (result.status !== 0) {
      throw new Error(`Foreground Counter exited with code ${result.status}`)
    }
    console.log("Foreground Counter exited normally.")
  } finally {
    rmSync(consumerDir, { recursive: true, force: true })
    rmSync(publishDir, { recursive: true, force: true })
    if (tarballPath) rmSync(tarballPath, { force: true })
  }
}

function stampCandidateVersion() {
  const stagedManifestPath = join(publishDir, "package.json")
  const staged = readJson(stagedManifestPath)
  if (staged.name !== "gpuix-solid" || staged.version !== "0.1.0-beta.5") {
    throw new Error(`Unexpected staged package ${staged.name}@${staged.version}`)
  }
  staged.version = candidateVersion
  writeFileSync(stagedManifestPath, `${JSON.stringify(staged, null, 2)}\n`)
}

function resetConsumer() {
  rmSync(consumerDir, { recursive: true, force: true })
  mkdirSync(join(consumerDir, "src"), { recursive: true })
  cpSync(join(repoRoot, "examples", "counter", "src", "index.tsx"), join(consumerDir, "src", "index.tsx"))
  cpSync(join(repoRoot, "examples", "counter", "vite.config.ts"), join(consumerDir, "vite.config.ts"))
  writeFileSync(join(consumerDir, "package.json"), `${JSON.stringify({
    name: "gpuix-solid-beta6-gpuix-main",
    private: true,
    type: "module",
  }, null, 2)}\n`)
}

function normalizeGeneratedNativeDeclaration() {
  const generatedDeclaration = "packages/native/index.d.ts"
  const changed = changedNativeFiles()
  const unexpected = changed.filter(
    (path) => path !== generatedDeclaration && !expectedSourcePatch().includes(path),
  )
  if (unexpected.length > 0) {
    throw new Error(`Unexpected GPUIX changes before foreground run: ${JSON.stringify(unexpected)}`)
  }
  if (changed.includes(generatedDeclaration)) {
    run("git", ["restore", "--source=HEAD", "--", generatedDeclaration], nativeCheckout)
    console.log(`Restored generated ${generatedDeclaration} after napi build ordering drift.`)
  }
  assertExactSourcePatch()
  run("git", ["diff", "--check"], nativeCheckout)
}

function expectedSourcePatch() {
  return [
    "packages/native/src/renderer.rs",
    "packages/native/src/text/paint.rs",
  ]
}

function assertExactSourcePatch() {
  const changed = changedNativeFiles()
  const expected = expectedSourcePatch()
  if (JSON.stringify(changed) !== JSON.stringify(expected)) {
    throw new Error(`Native ownership overlay is not exact: ${JSON.stringify(changed)}`)
  }
}

function requirePatchedNative() {
  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  if (head !== nativeSha) {
    throw new Error(`Native checkout is ${head}; expected ${nativeSha}. Run prepare first.`)
  }

  assertExactSourcePatch()

  const manifest = readJson(join(nativePackage, "package.json"))
  if (manifest.name !== "@gpuix/native" || manifest.version !== nativeVersion) {
    throw new Error(`Unexpected native package ${manifest.name}@${manifest.version}`)
  }
  if (listNativeBinaries().length === 0) {
    throw new Error("Patched GPUIX main native build has no .node binary. Run prepare first.")
  }
}

function printStatus() {
  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  console.log(JSON.stringify({
    candidateVersion,
    nativeVersion,
    nativeSha,
    checkout: nativeCheckout,
    checkoutHead: head,
    changedFiles: changedNativeFiles(),
    nativeBinaries: listNativeBinaries(),
  }, null, 2))
}

function cleanup() {
  rmSync(consumerDir, { recursive: true, force: true })
  rmSync(publishDir, { recursive: true, force: true })
  console.log("Removed temporary edge-beta consumer and staged Solid package. The ignored GPUIX source cache is retained.")
}

function runEdge(edgeCommand) {
  run("node", ["scripts/gpuix-edge.mjs", edgeCommand], repoRoot, {
    ...process.env,
    GPUIX_EDGE_SHA: nativeSha,
  })
}

function changedNativeFiles() {
  return capture("git", ["diff", "--name-only"], nativeCheckout)
    .split("\n")
    .filter(Boolean)
}

function listNativeBinaries() {
  return readdirSync(nativePackage).filter((name) => name.endsWith(".node"))
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function run(executable, args, cwd, env = process.env) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit", env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status ?? result.signal}`)
  }
}

function capture(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, encoding: "utf8", env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status}: ${result.stderr.trim()}`)
  }
  return result.stdout.trim()
}
