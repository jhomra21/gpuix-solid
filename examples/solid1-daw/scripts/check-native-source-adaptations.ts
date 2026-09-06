import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { adaptDawNativeSource } from "../native-source-adaptations.ts"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const waveformSources = [
  "src/upstream/components/timeline/ClipComponent.tsx",
  "src/upstream/components/timeline/SampleDetailWaveform.tsx",
]

for (const relativePath of waveformSources) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = readFileSync(absolutePath, "utf8")
  const canvasCount = source.match(/<canvas(?=[\s/>])/g)?.length ?? 0
  if (canvasCount !== 1) {
    throw new Error(`${relativePath}: expected exactly one upstream canvas, found ${canvasCount}`)
  }
  const adapted = adaptDawNativeSource(source, absolutePath)
  if (!adapted) throw new Error(`${relativePath}: native adaptation did not run`)
  if (adapted.includes("<canvas")) throw new Error(`${relativePath}: native adaptation left a canvas element behind`)
  const placeholderCount = adapted.match(/<NativeWaveformSvg(?=[\s/>])/g)?.length ?? 0
  if (placeholderCount !== 1) {
    throw new Error(`${relativePath}: expected one SVG waveform placeholder, found ${placeholderCount}`)
  }
}

const unrelatedPath = path.join(projectRoot, "src/upstream/components/timeline/TimelineRuler.tsx")
const unrelated = readFileSync(unrelatedPath, "utf8")
if (adaptDawNativeSource(unrelated, unrelatedPath) !== undefined) {
  throw new Error("native waveform adaptation must not touch source files without canvas")
}

console.log(`DAW native source adaptation: ${waveformSources.length} upstream canvas surfaces -> shared SVG placeholder`)
