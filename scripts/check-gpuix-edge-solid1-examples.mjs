import { spawnSync } from "node:child_process"
import { readFile, realpath } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(await readFile(join(repoRoot, ".gpuix", "edge.json"), "utf8"))
const edgeNative = join(
  repoRoot,
  ".cache",
  "gpuix",
  `${config.repository.replace("/", "--")}-${config.sha.slice(0, 12)}`,
  "packages",
  "native",
)

const consumers = [
  "experiments/solid1",
  "examples/solid1-kobalte",
  "examples/solid1-blurred-window",
  "examples/solid1-tailwind",
  "examples/solid1-daw",
]

for (const directory of consumers) {
  run("bun", ["install", "--no-save"], directory)
}

// Installs above may restore registry @gpuix/native packages. Relink once, after
// every dependency tree exists, so all compatibility builds use the source build.
run(process.execPath, ["scripts/gpuix-edge.mjs", "link"], ".")
run(process.execPath, ["scripts/gpuix-edge.mjs", "status"], ".")

const expectedNative = await realpath(edgeNative)
for (const directory of ["packages/solid1", ...consumers]) {
  const installedNative = await realpath(join(repoRoot, directory, "node_modules", "@gpuix", "native"))
  if (installedNative !== expectedNative) {
    throw new Error(`${directory} is not linked to the source-built GPUIX native package`)
  }
}

run("bun", ["run", "typecheck"], "experiments/solid1")
run("bun", ["run", "build"], "experiments/solid1")
for (const directory of [
  "examples/solid1-kobalte",
  "examples/solid1-blurred-window",
  "examples/solid1-tailwind",
]) {
  run("bun", ["run", "typecheck"], directory)
  run("bun", ["run", "build"], directory)
}
run("bun", ["run", "typecheck:edge"], "examples/solid1-daw")
run("bun", ["run", "build:edge"], "examples/solid1-daw")

console.log("Solid 1 source-edge consumer typecheck/build: passed")

function run(executable, args, directory) {
  const cwd = resolve(repoRoot, directory)
  console.log(`\n> (${directory}) ${executable} ${args.join(" ")}`)
  const result = spawnSync(executable, args, { cwd, stdio: "inherit", env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed in ${directory} with exit code ${result.status}`)
  }
}
