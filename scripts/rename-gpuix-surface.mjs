import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"

function replaceAll(path, replacements) {
  let source = readFileSync(path, "utf8")
  for (const [from, to] of replacements) {
    if (!source.includes(from)) {
      throw new Error(`${path}: missing expected text ${JSON.stringify(from)}`)
    }
    source = source.replaceAll(from, to)
  }
  writeFileSync(path, source)
}

function rename(from, to) {
  if (!existsSync(from)) throw new Error(`Missing rename source: ${from}`)
  if (existsSync(to)) throw new Error(`Rename destination already exists: ${to}`)
  renameSync(from, to)
}

rename("examples/counter/src/gpuix-08", "examples/counter/src/gpuix-surface")
rename("examples/counter/vite.gpuix-08.config.ts", "examples/counter/vite.gpuix-surface.config.ts")
rename("examples/counter/vite.gpuix-08-test.config.ts", "examples/counter/vite.gpuix-surface-test.config.ts")

replaceAll("package.json", [["gpuix-08", "gpuix-surface"]])
replaceAll("examples/counter/package.json", [["gpuix-08", "gpuix-surface"]])
replaceAll("README.md", [["example:gpuix-08", "example:gpuix-surface"]])
replaceAll("examples/README.md", [
  ["example:gpuix-08", "example:gpuix-surface"],
  ["focused GPUIX 0.8 accessibility/textarea/text-decoration Solid regression", "focused GPUIX 0.9 accessibility/textarea/text-decoration/selection Solid regression"],
])
replaceAll("examples/source-ownership.json", [
  ["example:gpuix-08", "example:gpuix-surface"],
  ["Repository-owned focused showcase for public GPUIX 0.8 capabilities proven through the Solid host.", "Repository-owned focused showcase for the current published GPUIX capabilities proven through the Solid host."],
])
replaceAll("examples/counter/src/readme-gallery/capture.tsx", [
  ["Gpuix08Showcase", "GpuixSurfaceShowcase"],
  ["../gpuix-08/app", "../gpuix-surface/app"],
  ["name: \"gpuix-08\"", "name: \"gpuix-surface\""],
])
replaceAll("scripts/test-published-foreground.mjs", [
  ["gpuix-08", "gpuix-surface"],
  ["GPUIX 0.8 text/input surface", "GPUIX 0.9 text/input/selection surface"],
])
replaceAll("examples/counter/vite.gpuix-surface.config.ts", [["gpuix-08", "gpuix-surface"]])
replaceAll("examples/counter/vite.gpuix-surface-test.config.ts", [["gpuix-08", "gpuix-surface"]])
replaceAll("examples/counter/src/gpuix-surface/app.tsx", [
  ["Gpuix08Showcase", "GpuixSurfaceShowcase"],
  ["gpuix08.accessible-action", "gpuix.surface.accessible-action"],
])
replaceAll("examples/counter/src/gpuix-surface/index.tsx", [
  ["Gpuix08Showcase", "GpuixSurfaceShowcase"],
  ["GPUIX 0.8", "GPUIX 0.9"],
])
replaceAll("examples/counter/src/gpuix-surface/test.tsx", [
  ["Gpuix08Showcase", "GpuixSurfaceShowcase"],
  ["gpuix08.accessible-action", "gpuix.surface.accessible-action"],
])

console.log("Renamed the current GPUIX example surface to version-neutral gpuix-surface")
