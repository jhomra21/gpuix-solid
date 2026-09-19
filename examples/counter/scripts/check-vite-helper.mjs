import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const configs = readdirSync(root)
  .filter((name) => name === "vite.config.ts" || /^vite\..+\.config\.ts$/u.test(name))
  .sort()

if (configs.length === 0) throw new Error("No Solid 2 Vite configs found")

for (const name of configs) {
  const source = readFileSync(new URL(`../${name}`, import.meta.url), "utf8")
  if (!source.includes('from "gpuix-solid/vite"') || !source.includes("gpuixSolid()")) {
    throw new Error(`${name} must use gpuixSolid() from gpuix-solid/vite`)
  }
  if (source.includes("@solidjs/vite-plugin")) {
    throw new Error(`${name} must not duplicate the Solid compiler setup directly`)
  }
  if (source.includes('conditions: ["browser", "development"]')) {
    throw new Error(`${name} must not duplicate GPUix Solid runtime conditions`)
  }
  if (source.includes('external: ["@gpuix/native"]')) {
    throw new Error(`${name} must not duplicate GPUix Solid native externalization`)
  }
}

console.log(`Solid 2 example Vite helper: PASS (${configs.length} configs)`)
