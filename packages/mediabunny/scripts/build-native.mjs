#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const optional = process.argv.includes("--optional")

if (process.platform !== "darwin") {
  console.log(
    "Skipping gpuix-mediabunny VideoToolbox addon build: native acceleration is macOS-only.",
  )
  process.exit(0)
}

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(import.meta.url)
let nodeGypCli
try {
  const nodeGypPackage = require.resolve("node-gyp/package.json")
  nodeGypCli = join(dirname(nodeGypPackage), "bin", "node-gyp.js")
} catch (error) {
  if (optional) {
    console.warn(
      "gpuix-mediabunny: node-gyp is unavailable; VideoToolbox acceleration will be disabled.",
    )
    process.exit(0)
  }
  throw error
}

const result = spawnSync(
  process.execPath,
  [
    nodeGypCli,
    "rebuild",
    "--directory",
    join(packageDirectory, "native", "videotoolbox"),
  ],
  {
    cwd: packageDirectory,
    stdio: "inherit",
  },
)

if (result.error) {
  if (optional) {
    console.warn(
      "gpuix-mediabunny: VideoToolbox addon build could not start; falling back to MediaBunny Server.",
    )
    process.exit(0)
  }
  throw result.error
}

if (result.status !== 0) {
  if (optional) {
    console.warn(
      "gpuix-mediabunny: VideoToolbox addon build failed; falling back to MediaBunny Server.",
    )
    process.exit(0)
  }
  throw new Error(
    "gpuix-mediabunny VideoToolbox addon build failed with status "
      + String(result.status),
  )
}
