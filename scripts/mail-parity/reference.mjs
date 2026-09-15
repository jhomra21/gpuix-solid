import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

export const REACT_SHA = "8d3ec094387152558d05a5b37de3cfbfca5d2d0a"
export const REACT_MAIL_BLOB_SHA = "c8d0f4a0950c553a9b4be97c9ca26f8316b96f0d"
const cacheRoot = fileURLToPath(new URL("../../.cache/gpuix/", import.meta.url))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : "pipe",
  })
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
    throw new Error(command + " " + args.join(" ") + " failed" + (detail ? "\n" + detail : ""))
  }
  return (result.stdout ?? "").trim()
}

function findExistingCheckout() {
  const preferred = [
    join(cacheRoot, "remorses--gpuix-8d3ec0943871"),
    join(cacheRoot, "react-mail-0.8.0"),
  ]
  for (const candidate of preferred) {
    if (existsSync(join(candidate, ".git"))) return candidate
  }
  return null
}

export function inspectReactReference(checkout) {
  const source = join(checkout, "examples/mail.tsx")
  const packageJson = JSON.parse(readFileSync(join(checkout, "packages/react/package.json"), "utf8"))
  return {
    checkout,
    sha: run("git", ["rev-parse", "HEAD"], { cwd: checkout }),
    packageVersion: packageJson.version,
    mailBlobSha: run("git", ["rev-parse", "HEAD:examples/mail.tsx"], { cwd: checkout }),
    mailSource: readFileSync(source, "utf8"),
  }
}

export function ensureReactReference(repoRoot) {
  mkdirSync(cacheRoot, { recursive: true })
  let checkout = findExistingCheckout()
  if (!checkout) {
    checkout = join(cacheRoot, "react-mail-0.8.0")
    run(
      "git",
      ["clone", "--recurse-submodules", "https://github.com/remorses/gpuix.git", checkout],
      { cwd: repoRoot, capture: false },
    )
  }

  run("git", ["fetch", "--quiet", "origin"], { cwd: checkout })
  run("git", ["checkout", "--quiet", REACT_SHA], { cwd: checkout })
  run("git", ["reset", "--hard", "--quiet", REACT_SHA], { cwd: checkout })
  run("git", ["submodule", "update", "--init", "--recursive", "--force", "--quiet"], { cwd: checkout })

  const nativeBinary = join(checkout, "packages/native/gpuix-native.darwin-arm64.node")
  const reactDist = join(checkout, "packages/react/dist/automation/index.js")
  const buildStamp = join(checkout, ".gpuix-solid-mail-parity-build")
  const buildMatchesReference =
    existsSync(nativeBinary) &&
    existsSync(reactDist) &&
    existsSync(buildStamp) &&
    readFileSync(buildStamp, "utf8").trim() === REACT_SHA

  if (!buildMatchesReference) {
    run("bun", ["install", "--frozen-lockfile"], { cwd: checkout, capture: false })
    run("bun", ["run", "build"], { cwd: checkout, capture: false })
    writeFileSync(buildStamp, REACT_SHA + "\n")
  }

  const info = inspectReactReference(checkout)
  if (info.sha !== REACT_SHA) throw new Error("React checkout drifted to " + info.sha)
  if (info.packageVersion !== "0.8.0") {
    throw new Error("Expected React package version 0.8.0, got " + info.packageVersion)
  }
  if (info.mailBlobSha !== REACT_MAIL_BLOB_SHA) {
    throw new Error("React Mail blob drifted to " + info.mailBlobSha)
  }
  return info
}

export function auditCurrentMain(checkout) {
  run("git", ["fetch", "--quiet", "origin", "main"], { cwd: checkout })
  const currentSha = run("git", ["rev-parse", "origin/main"], { cwd: checkout })
  const diff = run(
    "git",
    ["diff", "--unified=1", REACT_SHA, currentSha, "--", "examples/mail.tsx"],
    { cwd: checkout },
  )
  return { currentSha, diff }
}
