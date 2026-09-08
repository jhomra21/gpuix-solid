import { access, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"))
const manifest = JSON.parse(await readFile(join(root, "examples", "source-ownership.json"), "utf8"))

const allowed = new Set(manifest.classifications ?? [])
const runnable = Object.keys(packageJson.scripts ?? {}).filter((name) => name.startsWith("example:")).sort()
const declared = Object.keys(manifest.examples ?? {}).sort()
const failures = []

if (JSON.stringify(runnable) !== JSON.stringify(declared)) {
  failures.push(`example commands differ from ownership manifest\n  commands: ${runnable.join(", ")}\n  manifest: ${declared.join(", ")}`)
}

for (const [name, entry] of Object.entries(manifest.examples ?? {})) {
  if (!allowed.has(entry.classification)) {
    failures.push(`${name}: unknown classification ${String(entry.classification)}`)
    continue
  }

  const derived = entry.classification !== "original"
  if (derived) {
    if (!entry.repository) failures.push(`${name}: derived example is missing repository`)
    if (!entry.revision) failures.push(`${name}: derived example is missing revision`)
    if (!entry.contract) failures.push(`${name}: derived example is missing contract`)
  } else if (!entry.note) {
    failures.push(`${name}: original example is missing ownership note`)
  }

  for (const field of ["contract", "referenceContract"]) {
    const path = entry[field]
    if (!path) continue
    try {
      await access(join(root, path))
    } catch {
      failures.push(`${name}: ${field} does not exist: ${path}`)
    }
  }
}

if (failures.length > 0) {
  console.error("Example source ownership check failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Example source ownership: ${declared.length} runnable examples classified and contracted`)
