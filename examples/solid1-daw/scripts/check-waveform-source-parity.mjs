import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = path.resolve(projectRoot, "../..")
const upstreamRevision = "2eaad47813b15aa8511bab8dc04625510c977b12"
const copiedSources = [
  ["src/upstream/packages/waveforms/render-waveform.ts", "packages/waveforms/src/render-waveform.ts", "3358777800f22882e3127edb76b8241074a7e516"],
  ["src/upstream/packages/waveforms/extract-peaks.ts", "packages/waveforms/src/extract-peaks.ts", "ff6f64c864696adc3f4ae0243d609679356382b1"],
  ["src/upstream/packages/waveforms/resample-peak-pairs.ts", "packages/waveforms/src/resample-peak-pairs.ts", "24479351f244a4a8b89d1137fd7ea39af8ecdf72"],
  ["src/upstream/packages/waveforms/types.ts", "packages/waveforms/src/types.ts", "5cf5ecfaabd7666fe6ca71121513f5e348ae3b2b"],
]

function gitBlobHash(content) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content)
  const header = Buffer.from(`blob ${body.length}\0`)
  return createHash("sha1").update(header).update(body).digest("hex")
}

function normalizeCheckoutLineEndings(content) {
  return Buffer.from(content.toString("utf8").replaceAll("\r\n", "\n"))
}

function committedBlob(localPath) {
  const repositoryPath = `examples/solid1-daw/${localPath}`
  return execFileSync("git", ["rev-parse", `HEAD:${repositoryPath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim()
}

for (const [localPath, upstreamPath, expectedBlob] of copiedSources) {
  const trackedBlob = committedBlob(localPath)
  if (trackedBlob !== expectedBlob) {
    throw new Error(`${localPath} committed blob drifted from ${upstreamPath}@${upstreamRevision}: expected ${expectedBlob}, got ${trackedBlob}`)
  }

  const checkout = await readFile(path.join(projectRoot, localPath))
  const checkoutBlob = gitBlobHash(normalizeCheckoutLineEndings(checkout))
  if (checkoutBlob !== expectedBlob) {
    throw new Error(`${localPath} working copy drifted from ${upstreamPath}@${upstreamRevision}: expected ${expectedBlob}, got ${checkoutBlob}`)
  }
}

console.log(`DAW waveform source parity OK (${copiedSources.length} exact committed files at ${upstreamRevision})`)
