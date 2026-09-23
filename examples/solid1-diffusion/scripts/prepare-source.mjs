import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
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

function functionEnd(source, start) {
  const bodyStart = source.indexOf("{", start)
  if (bodyStart < 0) throw new Error("Could not find Koota checkQuery body")

  let depth = 0
  for (let index = bodyStart; index < source.length; index++) {
    const char = source[index]
    if (char === "{") depth += 1
    if (char === "}") {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  throw new Error("Could not find end of Koota checkQuery")
}

function patchKootaOrAcrossGenerations(file) {
  if (!existsSync(file)) return

  const source = readFileSync(file, "utf8")
  if (source.includes("gpuix-koota-or-cross-generation")) return

  const brokenOr = /if\s*\(\s*or\s*!==\s*0\s*&&\s*\(entityMask\s*&\s*or\)\s*===\s*0\s*\)\s*return false;/
  const brokenMatch = brokenOr.exec(source)
  if (!brokenMatch) {
    throw new Error(`Could not find Koota cross-generation Or check in ${file}`)
  }

  const start = source.lastIndexOf("function ", brokenMatch.index)
  if (start < 0) throw new Error(`Could not find Koota query function around Or check in ${file}`)
  const end = functionEnd(source, start)
  let checkQuery = source.slice(start, end)

  const emptyGuard = /if\s*\(\s*query\.traitInstances\.all\.length\s*===\s*0\s*\)\s*return false;/
  const emptyMatch = emptyGuard.exec(checkQuery)
  if (!emptyMatch) {
    throw new Error(`Koota query guard changed in ${file}`)
  }
  checkQuery = checkQuery.replace(
    emptyGuard,
    `${emptyMatch[0]}
  // gpuix-koota-or-cross-generation: Or(...) is one union across every trait generation.
  let hasOr = false;
  let orMatched = false;`,
  )

  checkQuery = checkQuery.replace(
    brokenOr,
    `if (or !== 0) {
      hasOr = true;
      if ((entityMask & or) !== 0) orMatched = true;
    }`,
  )

  const finalReturn = checkQuery.lastIndexOf("return true;")
  if (finalReturn < 0) throw new Error(`Could not find Koota checkQuery return in ${file}`)
  checkQuery =
    checkQuery.slice(0, finalReturn) +
    "if (hasOr && !orMatched) return false;\n  " +
    checkQuery.slice(finalReturn)

  writeFileSync(file, source.slice(0, start) + checkQuery + source.slice(end))
  console.log(`Patched Koota 0.6.6 cross-generation Or semantics: ${file}`)
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

for (const file of [
  join(sourceRoot, "node_modules", "koota", "dist", "index.js"),
  join(sourceRoot, "node_modules", "koota", "dist", "index.cjs"),
]) {
  patchKootaOrAcrossGenerations(file)
}

console.log(sourceRoot)
