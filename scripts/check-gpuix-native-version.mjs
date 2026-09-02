import { readFile } from "node:fs/promises"

const manifestPaths = [
  "packages/solid/package.json",
  "packages/solid1/package.json",
  "examples/counter/package.json",
  "examples/solid1-blurred-window/package.json",
  "examples/solid1-daw/package.json",
  "examples/solid1-kobalte/package.json",
  "examples/solid1-tailwind/package.json",
  "experiments/solid1/package.json",
]

const manifests = await Promise.all(manifestPaths.map(async (path) => ({
  path,
  json: JSON.parse(await readFile(path, "utf8")),
})))

const canonicalRange = manifests[0]?.json.dependencies?.["@gpuix/native"]
if (typeof canonicalRange !== "string" || !/^\^\d+\.\d+\.\d+$/.test(canonicalRange)) {
  throw new Error(`packages/solid must declare @gpuix/native with a caret semver range, got ${JSON.stringify(canonicalRange)}`)
}

for (const { path, json } of manifests) {
  const range = json.dependencies?.["@gpuix/native"]
  if (range !== canonicalRange) {
    throw new Error(`${path} declares @gpuix/native ${JSON.stringify(range)}; expected ${canonicalRange}`)
  }
}

const lock = await readFile("bun.lock", "utf8")
const resolvedMatch = lock.match(/"@gpuix\/native": \["@gpuix\/native@(\d+\.\d+\.\d+)"/)
if (!resolvedMatch) throw new Error("bun.lock does not contain a resolved @gpuix/native package")

const resolved = resolvedMatch[1]
if (!satisfiesCaretZeroRange(resolved, canonicalRange.slice(1))) {
  throw new Error(`bun.lock resolves @gpuix/native@${resolved}, which is outside ${canonicalRange}`)
}

for (const platform of ["darwin-arm64", "linux-x64-gnu", "win32-x64-msvc"]) {
  if (!lock.includes(`"@gpuix/native-${platform}": ["@gpuix/native-${platform}@${resolved}"`)) {
    throw new Error(`bun.lock does not resolve @gpuix/native-${platform}@${resolved}`)
  }
}

console.log(`GPUIX native version policy: ${manifestPaths.length} manifests use ${canonicalRange}; bun.lock resolves ${resolved}`)

function satisfiesCaretZeroRange(version, minimum) {
  const actual = version.split(".").map(Number)
  const base = minimum.split(".").map(Number)
  if (actual.length !== 3 || base.length !== 3 || [...actual, ...base].some((part) => !Number.isInteger(part))) return false
  if (base[0] === 0) {
    return actual[0] === 0 && actual[1] === base[1] && actual[2] >= base[2]
  }
  return actual[0] === base[0]
    && (actual[1] > base[1] || (actual[1] === base[1] && actual[2] >= base[2]))
}
