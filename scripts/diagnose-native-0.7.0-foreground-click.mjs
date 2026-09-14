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
const nativeSha = "a24b4a42eb516c7b940eb8d34ecebb077df623bd"
const nativeCheckout = join(repoRoot, ".cache", "gpuix", `remorses--gpuix-${nativeSha.slice(0, 12)}`)
const nativePackage = join(nativeCheckout, "packages", "native")
const patchPath = join(repoRoot, ".gpuix", "patches", "native-0.7.0-foreground-click.patch")
const solidPackage = join(repoRoot, "packages", "solid")
const publishDir = join(solidPackage, ".publish")
const consumerDir = "/private/tmp/gpuix-solid-native-0.7.0-foreground-click"
const command = process.argv[2] ?? "all"

switch (command) {
  case "prepare":
    preparePatchedNative()
    break
  case "run":
    runForegroundConsumer()
    break
  case "all":
    preparePatchedNative()
    runForegroundConsumer()
    break
  case "status":
    printStatus()
    break
  case "cleanup":
    cleanup()
    break
  default:
    throw new Error(`Unknown command ${JSON.stringify(command)}. Use all, prepare, run, status, or cleanup.`)
}

function preparePatchedNative() {
  run("bun", ["install", "--frozen-lockfile"], repoRoot)
  runEdge("sync")

  run("git", ["apply", "--check", patchPath], nativeCheckout)
  run("git", ["apply", patchPath], nativeCheckout)
  run("git", ["diff", "--check"], nativeCheckout)

  const changed = changedNativeFiles()
  const expected = [
    "packages/native/src/renderer.rs",
    "packages/native/src/text/paint.rs",
  ]
  if (JSON.stringify(changed) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected GPUIX patch surface: ${JSON.stringify(changed)}`)
  }

  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  if (head !== nativeSha) {
    throw new Error(`Patched checkout HEAD is ${head}; expected ${nativeSha}`)
  }

  runEdge("build")
  console.log(`Patched @gpuix/native source ready: remorses/gpuix@${nativeSha}`)
  console.log(`Native package: ${nativePackage}`)
}

function runForegroundConsumer() {
  requirePatchedNative()

  let tarballPath
  try {
    run("bun", ["run", "--filter", "gpuix-solid", "build"], repoRoot)
    run("node", ["scripts/stage-package.mjs"], solidPackage)

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
    symlinkSync(nativePackage, installedNative, "dir")

    const nativeManifest = readJson(join(nativePackage, "package.json"))
    const solidManifest = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
    const resolvedNative = realpathSync(installedNative)
    const expectedNative = realpathSync(nativePackage)

    if (solidManifest.version !== "0.1.0-beta.5") {
      throw new Error(`Expected diagnostic Solid package 0.1.0-beta.5, got ${solidManifest.version}`)
    }
    if (nativeManifest.version !== "0.7.0") {
      throw new Error(`Expected patched native package 0.7.0, got ${nativeManifest.version}`)
    }
    if (resolvedNative !== expectedNative) {
      throw new Error(`External consumer native resolves to ${resolvedNative}; expected ${expectedNative}`)
    }

    console.log(`External Solid: gpuix-solid@${solidManifest.version}`)
    console.log(`External native: @gpuix/native@${nativeManifest.version}`)
    console.log(`Patched native path: ${resolvedNative}`)
    console.log("Building foreground Counter...")
    run("bun", ["x", "vite", "build"], consumerDir)

    console.log("\nForeground gate:")
    console.log("1. Confirm initial paint")
    console.log("2. Hover +")
    console.log("3. Click + repeatedly")
    console.log("4. Click -")
    console.log("5. Click the number")
    console.log("6. Reset")
    console.log("7. Drag-select some text, then release")
    console.log("8. Close the window normally")
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

function resetConsumer() {
  rmSync(consumerDir, { recursive: true, force: true })
  mkdirSync(join(consumerDir, "src"), { recursive: true })
  cpSync(join(repoRoot, "examples", "counter", "src", "index.tsx"), join(consumerDir, "src", "index.tsx"))
  cpSync(join(repoRoot, "examples", "counter", "vite.config.ts"), join(consumerDir, "vite.config.ts"))
  writeFileSync(join(consumerDir, "package.json"), `${JSON.stringify({
    name: "gpuix-solid-native-0.7.0-foreground-click",
    private: true,
    type: "module",
  }, null, 2)}\n`)
}

function requirePatchedNative() {
  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  if (head !== nativeSha) {
    throw new Error(`Native checkout is ${head}; run this script with prepare first`)
  }

  const changed = changedNativeFiles()
  if (
    !changed.includes("packages/native/src/renderer.rs")
    || !changed.includes("packages/native/src/text/paint.rs")
  ) {
    throw new Error("Native foreground-click patch is not applied; run this script with prepare first")
  }

  const manifest = readJson(join(nativePackage, "package.json"))
  if (manifest.name !== "@gpuix/native" || manifest.version !== "0.7.0") {
    throw new Error(`Unexpected native package ${manifest.name}@${manifest.version}`)
  }
  if (listNativeBinaries().length === 0) {
    throw new Error("Patched native build has no .node binary; run this script with prepare first")
  }
}

function printStatus() {
  const head = capture("git", ["rev-parse", "HEAD"], nativeCheckout)
  console.log(JSON.stringify({
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
  console.log("Removed temporary foreground consumer and staged Solid package.")
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
