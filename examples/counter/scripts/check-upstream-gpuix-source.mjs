import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, "..", "..", "..")
const upstreamRoot = join(here, "..", "upstream")
const sourceNames = ["gpuix", "codeimage", "tanstack-router", "dashboard", "diffusion-editor"]

function gitBlobSha(path) {
  const repoPath = relative(repoRoot, path).replaceAll("\\", "/")
  return execFileSync(
    "git",
    ["hash-object", `--path=${repoPath}`, path],
    { cwd: repoRoot, encoding: "utf8" },
  ).trim()
}

let failed = false
for (const sourceName of sourceNames) {
  const root = join(upstreamRoot, sourceName)
  const lockPath = join(root, "upstream-lock.json")
  const lock = JSON.parse(await readFile(lockPath, "utf8"))
  const failures = []

  for (const [path, expected] of Object.entries(lock.blobs)) {
    const actual = gitBlobSha(join(root, path))
    if (actual !== expected) failures.push(`${path}: expected ${expected}, got ${actual}`)
  }

  if (failures.length > 0) {
    failed = true
    console.error(`Pinned ${sourceName} source drifted from ${lock.repository}@${lock.commit}:`)
    for (const failure of failures) console.error(`- ${failure}`)
    console.error(`Update the pin explicitly; do not edit files under upstream/${sourceName} by hand.`)
    continue
  }

  console.log(`Pinned ${sourceName} source: ${Object.keys(lock.blobs).length} blobs match ${lock.repository}@${lock.commit}`)
}

if (failed) process.exit(1)
