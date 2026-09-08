import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, "..", "..", "..")
const upstreamRoot = join(here, "..", "upstream")
const sourceNames = ["gpuix", "codeimage", "tanstack-router", "dashboard", "diffusion-editor"]
const sourceMainCommit = "6b4be86952aa89cfe61bb573740aea33fef5c5c4"
const sourceMainSurfaces = {
  "blurred-window": {
    source: "examples/blurred-window.tsx",
    sha: "3797c0ef9fd32646e4c9ad03f5274ab027b4fcb3",
    target: "examples/counter/src/blurred-window.tsx",
    referenceTarget: "examples/solid1-blurred-window/src/index.tsx",
    mode: "intentional-showcase-override",
  },
  counter: {
    source: "examples/counter.tsx",
    sha: "a9a18006b1215b11b98f2277826df39ee87aece3",
    target: "examples/counter/src/index.tsx",
    mode: "source-port",
  },
  diff: {
    source: "examples/diff.tsx",
    sha: "825b169161ed3e20dd79181490cb0afc9748322a",
    target: "examples/counter/src/diff/app.tsx",
    mode: "source-port",
  },
  "native-text": {
    source: "examples/native-text.tsx",
    sha: "f70cf5bf1209d9c58857050a1334526231f0253f",
    target: "examples/counter/src/native-text.tsx",
    mode: "source-port",
  },
  chat: {
    source: "examples/chat.tsx",
    sha: "bfd3df309df77fd0e28aa8dcbc864e021e82b8fc",
    target: "examples/counter/src/chat/shell.tsx",
    mode: "source-port",
  },
  "infinite-chat": {
    source: "examples/infinite-chat.tsx",
    sha: "b41762e95ab57fb7959ee41ff57521857c338f93",
    target: "examples/counter/src/infinite-chat/app.tsx",
    mode: "source-port",
  },
  timeline: {
    source: "examples/timeline.tsx",
    sha: "0ec029157b39efeac1bb88617938e7d142c4be88",
    target: "examples/counter/src/timeline/app.tsx",
    mode: "source-port",
  },
  mail: {
    source: "examples/mail.tsx",
    sha: "c8d0f4a0950c553a9b4be97c9ca26f8316b96f0d",
    target: "examples/counter/src/mail/app.tsx",
    mode: "source-port",
  },
}

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

const surfaceLockPath = join(upstreamRoot, "gpuix", "source-main-surface-lock.json")
const surfaceLock = JSON.parse(await readFile(surfaceLockPath, "utf8"))
const surfaceFailures = []

if (surfaceLock.repository !== "remorses/gpuix") {
  surfaceFailures.push(`repository: expected remorses/gpuix, got ${surfaceLock.repository}`)
}
if (surfaceLock.commit !== sourceMainCommit) {
  surfaceFailures.push(`commit: expected ${sourceMainCommit}, got ${surfaceLock.commit}`)
}

const expectedNames = Object.keys(sourceMainSurfaces).sort()
const actualNames = Object.keys(surfaceLock.surfaces ?? {}).sort()
if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
  surfaceFailures.push(`surfaces: expected ${expectedNames.join(", ")}, got ${actualNames.join(", ")}`)
}

for (const [name, expected] of Object.entries(sourceMainSurfaces)) {
  const actual = surfaceLock.surfaces?.[name]
  if (!actual) continue
  for (const field of ["source", "sha", "target", "mode"]) {
    if (actual[field] !== expected[field]) {
      surfaceFailures.push(`${name}.${field}: expected ${expected[field]}, got ${actual[field]}`)
    }
  }
  if (expected.referenceTarget && actual.referenceTarget !== expected.referenceTarget) {
    surfaceFailures.push(`${name}.referenceTarget: expected ${expected.referenceTarget}, got ${actual.referenceTarget}`)
  }
  for (const path of [expected.target, expected.referenceTarget].filter(Boolean)) {
    try {
      await readFile(join(repoRoot, path))
    } catch {
      surfaceFailures.push(`${name}: missing ${path}`)
    }
  }
}

if (surfaceFailures.length > 0) {
  failed = true
  console.error(`Pinned GPUIX source-main surface drifted from remorses/gpuix@${sourceMainCommit}:`)
  for (const failure of surfaceFailures) console.error(`- ${failure}`)
  console.error("Update the source-main surface pin and its Solid port deliberately in the same change.")
} else {
  console.log(`Pinned GPUIX source-main surface: ${expectedNames.length} derived examples match remorses/gpuix@${sourceMainCommit}`)
}

if (failed) process.exit(1)
