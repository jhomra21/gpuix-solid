import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const lock = JSON.parse(await readFile(path.join(root, "upstream-lock.json"), "utf8"))
const upstreamRoot = path.join(root, "src", "upstream", "kobalte")

for (const source of lock.files) {
  const url = `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${source}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const upstream = normalizeLineEndings(await response.text())
  const relative = source === "LICENSE.md"
    ? "LICENSE.md"
    : source.replace(/^apps\/docs\/src\//, "")
  const localPath = path.join(upstreamRoot, relative)
  const local = normalizeLineEndings(await readFile(localPath, "utf8"))

  if (local !== upstream) {
    throw new Error([
      `${path.relative(root, localPath)} is no longer a verbatim copy of pinned Kobalte source.`,
      `upstream: ${lock.repository}@${lock.commit}:${source}`,
      "Fix compatibility underneath the copied source instead of editing the Kobalte example.",
    ].join("\n"))
  }
}

console.log(`Kobalte verbatim source parity: ${lock.files.length} files match ${lock.commit}`)

function normalizeLineEndings(value) {
  return value.replaceAll("\r\n", "\n")
}
