import { spawnSync } from "node:child_process"
import { access, lstat, mkdir, readFile, readdir, realpath, rm, symlink } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const configPath = join(repoRoot, ".gpuix", "edge.json")
const ignoredDirectories = new Set([".cache", ".git", ".publish", "coverage", "dist", "node_modules"])

const command = process.argv[2] ?? "status"
const config = JSON.parse(await readFile(configPath, "utf8"))
const repository = process.env.GPUIX_EDGE_REPOSITORY ?? config.repository
const sha = process.env.GPUIX_EDGE_SHA ?? config.sha
const branch = process.env.GPUIX_EDGE_BRANCH ?? config.branch ?? "main"

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Invalid GPUIX edge repository: ${JSON.stringify(repository)}`)
}
if (!/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error(`GPUIX edge SHA must be a full 40-character commit, got ${JSON.stringify(sha)}`)
}

const cacheRoot = resolve(repoRoot, process.env.GPUIX_EDGE_CACHE_DIR ?? ".cache/gpuix")
const checkout = join(cacheRoot, `${repository.replace("/", "--")}-${sha.slice(0, 12)}`)
const nativePackage = join(checkout, "packages", "native")
const remote = `https://github.com/${repository}.git`

switch (command) {
  case "sync":
    await syncSource()
    break
  case "build":
    await buildNative()
    break
  case "link":
    await linkNative()
    break
  case "prepare":
    await syncSource()
    await buildNative()
    await linkNative()
    break
  case "status":
    await printStatus()
    break
  case "tip":
    printTip()
    break
  default:
    throw new Error(`Unknown gpuix-edge command ${JSON.stringify(command)}. Use sync, build, link, prepare, status, or tip.`)
}

async function syncSource() {
  await mkdir(checkout, { recursive: true })
  if (!(await exists(join(checkout, ".git")))) {
    run("git", ["init"], checkout)
    run("git", ["remote", "add", "origin", remote], checkout)
  } else {
    run("git", ["remote", "set-url", "origin", remote], checkout)
  }

  run("git", ["fetch", "--depth=1", "origin", sha], checkout)
  run("git", ["checkout", "--detach", "--force", "FETCH_HEAD"], checkout)
  run("git", ["submodule", "sync", "--recursive"], checkout)
  run("git", ["submodule", "update", "--init", "--recursive", "--depth=1"], checkout)

  const head = capture("git", ["rev-parse", "HEAD"], checkout)
  if (head !== sha) throw new Error(`GPUIX edge checkout resolved ${head}; expected ${sha}`)
  console.log(`GPUIX edge source: ${repository}@${sha}`)
}

async function buildNative() {
  await requireCheckout()
  run("bun", ["install", "--frozen-lockfile"], checkout)
  run("bun", ["run", "build"], nativePackage)

  const manifest = JSON.parse(await readFile(join(nativePackage, "package.json"), "utf8"))
  if (manifest.name !== "@gpuix/native") {
    throw new Error(`Expected edge package @gpuix/native, got ${JSON.stringify(manifest.name)}`)
  }
  const binaries = (await readdir(nativePackage)).filter((name) => name.endsWith(".node"))
  if (binaries.length === 0) {
    throw new Error(`GPUIX edge native build produced no .node binary in ${nativePackage}`)
  }
  console.log(`GPUIX edge native build: ${binaries.join(", ")}`)
}

async function linkNative() {
  await requireNativeBuild()
  const packageRoots = await nativeConsumerRoots(repoRoot)
  const installRoots = new Set([repoRoot, ...packageRoots])
  let linked = 0

  for (const root of installRoots) {
    const modules = join(root, "node_modules")
    if (!(await exists(modules))) continue
    const scope = join(modules, "@gpuix")
    const destination = join(scope, "native")
    await mkdir(scope, { recursive: true })
    await rm(destination, { recursive: true, force: true })
    const linkType = process.platform === "win32" ? "junction" : "dir"
    await symlink(nativePackage, destination, linkType)
    linked += 1
    console.log(`GPUIX edge link: ${relative(repoRoot, destination) || destination} -> ${nativePackage}`)
  }

  if (linked === 0) {
    throw new Error("No installed node_modules trees were found. Run bun install before gpuix:edge:link.")
  }
}

async function printStatus() {
  const sourceReady = await exists(join(checkout, ".git"))
  const head = sourceReady ? capture("git", ["rev-parse", "HEAD"], checkout) : undefined
  const built = await nativeBuildExists()
  const linked = []

  for (const root of new Set([repoRoot, ...(await nativeConsumerRoots(repoRoot))])) {
    const destination = join(root, "node_modules", "@gpuix", "native")
    if (!(await exists(destination))) continue
    try {
      const target = await realpath(destination)
      if (target === await realpath(nativePackage)) linked.push(relative(repoRoot, destination))
    } catch {
      // A normal registry install is expected to resolve somewhere else.
    }
  }

  console.log(JSON.stringify({
    repository,
    branch,
    sha,
    checkout: relative(repoRoot, checkout),
    checkoutHead: head ?? null,
    sourceReady,
    nativeBuilt: built,
    linkedInstalls: linked,
  }, null, 2))
}

function printTip() {
  const output = capture("git", ["ls-remote", remote, `refs/heads/${branch}`], repoRoot)
  const tip = output.split(/\s+/)[0]
  if (!/^[0-9a-f]{40}$/i.test(tip ?? "")) {
    throw new Error(`Could not resolve ${repository} ${branch}`)
  }
  console.log(tip)
}

async function requireCheckout() {
  if (!(await exists(join(checkout, ".git")))) {
    throw new Error("GPUIX edge source is missing. Run bun run gpuix:edge:sync first.")
  }
  const head = capture("git", ["rev-parse", "HEAD"], checkout)
  if (head !== sha) throw new Error(`GPUIX edge checkout is ${head}; expected ${sha}`)
}

async function requireNativeBuild() {
  await requireCheckout()
  if (!(await nativeBuildExists())) {
    throw new Error("GPUIX edge native package is not built. Run bun run gpuix:edge:build first.")
  }
}

async function nativeBuildExists() {
  if (!(await exists(nativePackage))) return false
  return (await readdir(nativePackage)).some((name) => name.endsWith(".node"))
}

async function nativeConsumerRoots(root) {
  const roots = []
  await walk(root)
  return roots

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue
        await walk(join(directory, entry.name))
        continue
      }
      if (entry.name !== "package.json") continue
      const manifestPath = join(directory, entry.name)
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
      if (declaresNative(manifest)) roots.push(directory)
    }
  }
}

function declaresNative(manifest) {
  return [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]
    .some((dependencies) => dependencies?.["@gpuix/native"] !== undefined)
}

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit", env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status}`)
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

async function exists(path) {
  try {
    await access(path)
    const stat = await lstat(path)
    return stat.isDirectory() || stat.isFile() || stat.isSymbolicLink()
  } catch {
    return false
  }
}
