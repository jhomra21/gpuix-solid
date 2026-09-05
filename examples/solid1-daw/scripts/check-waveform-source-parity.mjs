import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const upstreamRevision = "2eaad47813b15aa8511bab8dc04625510c977b12"
const copiedSources = [
  ["src/upstream/packages/waveforms/render-waveform.ts", "packages/waveforms/src/render-waveform.ts", "3358777800f22882e3127edb76b8241074a7e516"],
  ["src/upstream/packages/waveforms/extract-peaks.ts", "packages/waveforms/src/extract-peaks.ts", "ff6f64c864696adc3f4ae0243d609679356382b1"],
  ["src/upstream/packages/waveforms/resample-peak-pairs.ts", "packages/waveforms/src/resample-peak-pairs.ts", "24479351f244a4a8b89d1137fd7ea39af8ecdf72"],
  ["src/upstream/packages/waveforms/types.ts", "packages/waveforms/src/types.ts", "5cf5ecfaabd7666fe6ca71121513f5e348ae3b2b"],
]

function gitBlobHash(source) {
  const body = Buffer.from(source)
  const header = Buffer.from(`blob ${body.length}\0`)
  return createHash("sha1").update(header).update(body).digest("hex")
}

for (const [localPath, upstreamPath, expectedBlob] of copiedSources) {
  const source = await readFile(path.join(projectRoot, localPath), "utf8")
  const actualBlob = gitBlobHash(source)
  if (actualBlob !== expectedBlob) {
    throw new Error(`${localPath} drifted from ${upstreamPath}@${upstreamRevision}: expected ${expectedBlob}, got ${actualBlob}`)
  }
}

console.log(`DAW waveform source parity OK (${copiedSources.length} exact files at ${upstreamRevision})`)
