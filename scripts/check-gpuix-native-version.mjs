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
if (!/^\^\d+\.\d+\.\d+$/.test(canonicalRange ?? "")) {
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
if (!satisfiesCaretRange(resolved, canonicalRange.slice(1))) {
  throw new Error(`bun.lock resolves @gpuix/native@${resolved}, which is outside ${canonicalRange}`)
}

for (const platform of ["darwin-arm64", "linux-x64-gnu", "win32-x64-msvc"]) {
  if (!lock.includes(`"@gpuix/native-${platform}": ["@gpuix/native-${platform}@${resolved}"`)) {
    throw new Error(`bun.lock does not resolve @gpuix/native-${platform}@${resolved}`)
  }
}

console.log(`GPUIX native version policy: ${manifestPaths.length} manifests use ${canonicalRange}; bun.lock resolves ${resolved}`)

function satisfiesCaretRange(version, minimum) {
  const actual = version.split(".").map(Number)
  const base = minimum.split(".").map(Number)
  if (actual.length !== 3 || base.length !== 3 || [...actual, ...base].some((part) => !Number.isInteger(part))) return false

  const [major, minor, patch] = actual
  const [baseMajor, baseMinor, basePatch] = base
  if (major === undefined || minor === undefined || patch === undefined || baseMajor === undefined || baseMinor === undefined || basePatch === undefined) return false

  if (baseMajor > 0) {
    return major === baseMajor
      && (minor > baseMinor || (minor === baseMinor && patch >= basePatch))
  }
  if (baseMinor > 0) {
    return major === 0 && minor === baseMinor && patch >= basePatch
  }
  return major === 0 && minor === 0 && patch === basePatch
}
