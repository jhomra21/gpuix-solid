import { spawnSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const nativeSha = "8d3ec094387152558d05a5b37de3cfbfca5d2d0a"
const nativeCheckout = join(repoRoot, ".cache", "gpuix", `remorses--gpuix-${nativeSha.slice(0, 12)}`)
const generatedDeclaration = "packages/native/index.d.ts"
const expectedSourcePatch = [
  "packages/native/src/renderer.rs",
  "packages/native/src/text/paint.rs",
]

run("node", ["scripts/test-beta6-gpuix-main.mjs", "check"], repoRoot)

const afterCheck = changedFiles()
const unexpected = afterCheck.filter(
  (path) => path !== generatedDeclaration && !expectedSourcePatch.includes(path),
)
if (unexpected.length > 0) {
  throw new Error(`Unexpected GPUIX changes after edge check: ${JSON.stringify(unexpected)}`)
}

if (afterCheck.includes(generatedDeclaration)) {
  // `napi build` rewrites the committed declaration file in a different order on
  // some local macOS installs. The public declarations are upstream-owned and
  // the ownership patch does not touch napi exports, so restore the exact pinned
  // file rather than treating generated ordering churn as a third source patch.
  run("git", ["restore", "--source=HEAD", "--", generatedDeclaration], nativeCheckout)
  console.log(`Restored generated ${generatedDeclaration} after native build.`)
}

const sourcePatch = changedFiles()
if (JSON.stringify(sourcePatch) !== JSON.stringify(expectedSourcePatch)) {
  throw new Error(`Native ownership overlay is not exact: ${JSON.stringify(sourcePatch)}`)
}

run("git", ["diff", "--check"], nativeCheckout)
run("node", ["scripts/test-beta6-gpuix-main.mjs", "run"], repoRoot)

function changedFiles() {
  return capture("git", ["diff", "--name-only"], nativeCheckout)
    .split("\n")
    .filter(Boolean)
}

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit", env: process.env })
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
