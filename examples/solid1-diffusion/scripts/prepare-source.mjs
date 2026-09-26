import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repository = "https://github.com/diffusionstudio/editor.git"
const commit = "666cdced1f6b97a792b63e551f45797649efb27a"
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const sourceRoot = join(repoRoot, ".cache", "diffusion-editor", commit.slice(0, 12))

function run(command, args, cwd = repoRoot, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  })
}

if (!existsSync(join(sourceRoot, ".git"))) {
  mkdirSync(sourceRoot, { recursive: true })
  run("git", ["init"], sourceRoot)
  run("git", ["remote", "add", "origin", repository], sourceRoot)
}

let current = ""
try {
  current = String(run("git", ["rev-parse", "HEAD"], sourceRoot, true)).trim()
} catch {}

if (current !== commit) {
  run("git", ["fetch", "--depth=1", "origin", commit], sourceRoot)
  run("git", ["checkout", "--detach", commit], sourceRoot)
}

const head = String(run("git", ["rev-parse", "HEAD"], sourceRoot, true)).trim()
if (head !== commit) {
  throw new Error(`Diffusion source pin mismatch: expected ${commit}, got ${head}`)
}

const markers = [
  "node_modules/koota/package.json",
  "node_modules/solid-js/package.json",
  "node_modules/@kobalte/core/package.json",
]
if (markers.some((marker) => !existsSync(join(sourceRoot, marker)))) {
  run("bun", [
    "install",
    "--ignore-scripts",
    "--filter",
    "@diffusionstudio/web",
    "--filter",
    "@diffusionstudio/runtime",
    "--filter",
    "@diffusionstudio/reconciler",
    "--filter",
    "@diffusionstudio/jsx",
    "--filter",
    "@diffusionstudio/assets",
    "--filter",
    "@diffusionstudio/koota-solid",
  ], sourceRoot)
}

console.log(sourceRoot)
