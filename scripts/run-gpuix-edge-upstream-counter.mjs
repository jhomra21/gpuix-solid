import { spawnSync } from "node:child_process"
import { access, readFile, readdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(await readFile(join(repoRoot, ".gpuix", "edge.json"), "utf8"))
const repository = process.env.GPUIX_EDGE_REPOSITORY ?? config.repository
const sha = process.env.GPUIX_EDGE_SHA ?? config.sha
const cacheRoot = resolve(repoRoot, process.env.GPUIX_EDGE_CACHE_DIR ?? ".cache/gpuix")
const checkout = join(cacheRoot, `${repository.replace("/", "--")}-${sha.slice(0, 12)}`)
const nativePackage = join(checkout, "packages", "native")

if (!(await exists(join(checkout, ".git")))) {
  throw new Error("Pinned GPUIX checkout is missing. Run bun run gpuix:edge:prepare first.")
}

const head = capture("git", ["rev-parse", "HEAD"], checkout)
if (head !== sha) {
  throw new Error(`Pinned GPUIX checkout is ${head}; expected ${sha}`)
}

const binaries = (await readdir(nativePackage)).filter((name) => name.endsWith(".node"))
if (binaries.length === 0) {
  throw new Error("Pinned GPUIX native build is missing. Run bun run gpuix:edge:prepare first.")
}

console.log(`GPUIX upstream foreground control: ${repository}@${sha}`)
console.log(`native build: ${binaries.join(", ")}`)
console.log("building upstream @gpuix/react from the same checkout...")
run("bun", ["run", "build"], join(checkout, "packages", "react"))
console.log("launching upstream examples/counter.tsx with normal foreground focus...")
run("bun", ["examples/counter.tsx"], checkout)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
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
