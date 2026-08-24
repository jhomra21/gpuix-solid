import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const packed = spawnSync(npm, ["pack", "--dry-run", "--json"], {
  cwd: packageRoot,
  encoding: "utf8",
})

if (packed.status !== 0) {
  process.stderr.write(packed.stderr)
  process.exit(packed.status ?? 1)
}

const output = JSON.parse(packed.stdout)
const manifest = Array.isArray(output) ? output[0] : output
if (!manifest || !Array.isArray(manifest.files)) {
  throw new TypeError("npm pack did not return a file manifest")
}

const files = new Set(manifest.files.map((entry) => entry.path))
const required = [
  "LICENSE",
  "README.md",
  "package.json",
  "jsx-runtime.d.ts",
  "jsx-dev-runtime.d.ts",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/automation/index.js",
  "dist/automation/index.d.ts",
]

for (const file of required) {
  if (!files.has(file)) throw new Error(`Publish tarball is missing ${file}`)
}

for (const file of files) {
  if (
    file.startsWith("src/") ||
    file.startsWith("test/") ||
    file.startsWith("scripts/") ||
    file.endsWith(".tsbuildinfo")
  ) {
    throw new Error(`Publish tarball contains development file ${file}`)
  }
}

console.log(
  `Validated ${manifest.name}@${manifest.version}: ${files.size} files, ${manifest.size} bytes packed`,
)
