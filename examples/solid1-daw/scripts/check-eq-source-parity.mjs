import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const upstreamRevision = "2eaad47813b15aa8511bab8dc04625510c977b12"
const copiedSources = [
  ["src/upstream/components/effects/Eq.tsx", "src/components/effects/Eq.tsx", "bb90f5dead1e52fc81c21790c01359b4d8737e98"],
  ["src/upstream/components/effects/eq-render-work.ts", "src/components/effects/eq-render-work.ts", "82a4562367f8a6ae379b1a95f317bee2e2548675"],
]

for (const [localPath, upstreamPath, expectedBlob] of copiedSources) {
  const content = Buffer.from((await readFile(path.join(projectRoot, localPath), "utf8")).replaceAll("\r\n", "\n"))
  const header = Buffer.from(`blob ${content.byteLength}\0`)
  const actualBlob = createHash("sha1").update(header).update(content).digest("hex")
  if (actualBlob !== expectedBlob) {
    throw new Error([
      `${localPath} is no longer a verbatim copy of the pinned DAW EQ source.`,
      `upstream: jhomra21/daw-browser-convex@${upstreamRevision}:${upstreamPath}`,
      `expected git blob: ${expectedBlob}`,
      `actual git blob:   ${actualBlob}`,
      "Fix compatibility underneath the copied EQ source instead of editing it.",
    ].join("\n"))
  }
}

console.log(`DAW EQ source parity: ${copiedSources.length} exact files match ${upstreamRevision}`)
