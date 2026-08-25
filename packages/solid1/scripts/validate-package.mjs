import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = path.resolve(packageRoot, "../..")
const npm = process.platform === "win32" ? "npm.cmd" : "npm"

const staged = spawnSync(process.execPath, [path.join(packageRoot, "scripts/stage-package.mjs")], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
if (staged.status !== 0) {
  process.stderr.write(staged.stderr)
  process.exit(staged.status ?? 1)
}

const packed = spawnSync(npm, ["pack", ".publish", "--dry-run", "--json"], {
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
  "dist/runtime.js",
  "dist/root.js",
  "dist/universal.js",
]
for (const file of required) {
  if (!files.has(file)) throw new Error(`Solid 1 publish tarball is missing ${file}`)
}

for (const file of files) {
  if (
    file.startsWith("src/") ||
    file.startsWith("scripts/") ||
    file.startsWith(".publish/") ||
    file.endsWith(".tsbuildinfo")
  ) {
    throw new Error(`Solid 1 publish tarball contains development file ${file}`)
  }
}

const publicPackage = JSON.parse(readFileSync(path.join(packageRoot, ".publish/package.json"), "utf8"))
if (publicPackage.name !== "@jhomra21/gpuix-solid1") {
  throw new Error(`Unexpected staged package name: ${publicPackage.name}`)
}
if (publicPackage.scripts !== undefined) throw new Error("Staged Solid 1 package must not publish workspace scripts")
if (publicPackage.devDependencies !== undefined) {
  throw new Error("Staged Solid 1 package must not publish development dependencies")
}
if (publicPackage.peerDependencies?.["solid-js"] !== ">=1.9.0 <2") {
  throw new Error(`Unexpected Solid peer range: ${publicPackage.peerDependencies?.["solid-js"]}`)
}
if (publicPackage.dependencies?.["@gpuix/native"] !== "^0.4.0") {
  throw new Error(`Unexpected GPUIX native dependency: ${publicPackage.dependencies?.["@gpuix/native"]}`)
}

console.log(
  `Validated staged ${manifest.name}@${manifest.version}: ${files.size} files, ${manifest.size} bytes packed`,
)
