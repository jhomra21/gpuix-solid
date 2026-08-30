import { createHash } from "node:crypto"
import { readFile, rm, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const lock = JSON.parse(await readFile(path.join(root, "upstream-lock.json"), "utf8"))
const outputRoot = path.join(root, "src", "upstream", "kobalte")

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })

for (const source of lock.files) {
  const url = `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${source}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const content = Buffer.from(await response.arrayBuffer())
  const expected = lock.blobs[source]
  const actual = gitBlobSha(content)
  if (!expected || actual !== expected) {
    throw new Error(`Pinned Kobalte blob mismatch for ${source}: expected ${expected ?? "missing"}, got ${actual}`)
  }

  const relative = source === "LICENSE.md"
    ? "LICENSE.md"
    : source.replace(/^apps\/docs\/src\//, "")
  const destination = path.join(outputRoot, relative)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, content)
}

console.log(`synced ${lock.files.length} verbatim Kobalte files at ${lock.commit}`)

function gitBlobSha(content) {
  return createHash("sha1")
    .update(`blob ${content.byteLength}\0`)
    .update(content)
    .digest("hex")
}
