import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

if (process.platform !== "darwin") {
  console.log(
    "Skipping gpuix-mediabunny VideoToolbox addon build: native acceleration is macOS-only.",
  )
  process.exit(0)
}

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(import.meta.url)
const nodeGypPackage = require.resolve("node-gyp/package.json")
const nodeGypCli = join(dirname(nodeGypPackage), "bin", "node-gyp.js")

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

if (result.error) throw result.error
if (result.status !== 0) {
  throw new Error(
    "gpuix-mediabunny VideoToolbox addon build failed with status "
      + String(result.status),
  )
}
