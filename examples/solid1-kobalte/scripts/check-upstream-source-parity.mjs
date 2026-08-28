import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const lock = JSON.parse(await readFile(path.join(root, "upstream-lock.json"), "utf8"))
const upstreamRoot = path.join(root, "src", "upstream", "kobalte")

for (const source of lock.files) {
  const relative = source === "LICENSE.md"
    ? "LICENSE.md"
    : source.replace(/^apps\/docs\/src\//, "")
  const localPath = path.join(upstreamRoot, relative)
  const content = await readFile(localPath)
  const actual = gitBlobSha(content)
  const expected = lock.blobs[source]

  if (!expected || actual !== expected) {
    throw new Error([
      `${path.relative(root, localPath)} is no longer a verbatim copy of pinned Kobalte source.`,
      `expected blob: ${expected ?? "missing from upstream-lock.json"}`,
      `actual blob:   ${actual}`,
      `upstream: ${lock.repository}@${lock.commit}:${source}`,
      "Fix compatibility underneath the copied source instead of editing the Kobalte example.",
    ].join("\n"))
  }
}

console.log(`Kobalte verbatim source parity: ${lock.files.length} files match ${lock.commit}`)

function gitBlobSha(content) {
  return createHash("sha1")
    .update(`blob ${content.byteLength}\0`)
    .update(content)
    .digest("hex")
}
