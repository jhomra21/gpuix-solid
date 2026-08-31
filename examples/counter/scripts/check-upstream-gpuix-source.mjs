import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..", "upstream", "gpuix")
const lockPath = join(root, "upstream-lock.json")
const lock = JSON.parse(await readFile(lockPath, "utf8"))

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`)
  return createHash("sha1").update(header).update(bytes).digest("hex")
}

const failures = []
for (const [path, expected] of Object.entries(lock.blobs)) {
  const bytes = await readFile(join(root, path))
  const actual = gitBlobSha(bytes)
  if (actual !== expected) failures.push(`${path}: expected ${expected}, got ${actual}`)
}

if (failures.length > 0) {
  console.error(`Pinned GPUIX source drifted from ${lock.repository}@${lock.commit}:`)
  for (const failure of failures) console.error(`- ${failure}`)
  console.error("Update the pin explicitly; do not edit files under upstream/gpuix by hand.")
  process.exit(1)
}

console.log(`Pinned GPUIX source: ${Object.keys(lock.blobs).length} blobs match ${lock.repository}@${lock.commit}`)
