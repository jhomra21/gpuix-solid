import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(projectRoot, "src/upstream/components/effects/Eq.tsx")
const outputPath = path.join(projectRoot, "generated/native-tailwind-eq-source.tsx")
const gridOwnedClass = "row-span-2"

const source = await readFile(sourcePath, "utf8")
const occurrences = source.split(gridOwnedClass).length - 1
if (occurrences !== 1) {
  throw new Error(`Expected exactly one ${JSON.stringify(gridOwnedClass)} class in exact Eq.tsx, found ${occurrences}`)
}

// The DAW renderer's two-row grid adapter owns this one source utility because
// GPUIX 0.7 does not expose CSS grid-row placement. Every other class remains
// byte-for-byte in this generated Tailwind inventory input and must compile
// through the normal native Tailwind manifest.
const inventorySource = source.replace(gridOwnedClass, "")

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, inventorySource)
console.log(`DAW EQ Tailwind inventory: exact Eq.tsx minus grid-owned ${gridOwnedClass}`)
