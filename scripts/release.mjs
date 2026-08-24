import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

export const PACKAGE_JSON_PATH = "packages/solid/package.json"
export const CHANGELOG_PATH = "CHANGELOG.md"

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export function parseVersion(value) {
  const match = SEMVER_RE.exec(value)
  if (!match) throw new Error(`Invalid release version: ${value}`)
  const prerelease = match[4]?.split(".") ?? []
  for (const identifier of prerelease) {
    if (/^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0")) {
      throw new Error(`Invalid release version: numeric prerelease identifier '${identifier}' has a leading zero`)
    }
  }
  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  }
}

function compareIdentifier(a, b) {
  const aNumeric = /^\d+$/.test(a)
  const bNumeric = /^\d+$/.test(b)
  if (aNumeric && bNumeric) {
    const aNumber = BigInt(a)
    const bNumber = BigInt(b)
    return aNumber === bNumber ? 0 : aNumber < bNumber ? -1 : 1
  }
  if (aNumeric) return -1
  if (bNumeric) return 1
  return a === b ? 0 : a < b ? -1 : 1
}

export function compareVersions(aValue, bValue) {
  const a = typeof aValue === "string" ? parseVersion(aValue) : aValue
  const b = typeof bValue === "string" ? parseVersion(bValue) : bValue
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return Math.sign(a[key] - b[key])
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index++) {
    if (a.prerelease[index] === undefined) return -1
    if (b.prerelease[index] === undefined) return 1
    const result = compareIdentifier(a.prerelease[index], b.prerelease[index])
    if (result !== 0) return result
  }
  return 0
}

export function nextVersion(currentValue, type, explicitValue) {
  const current = parseVersion(currentValue)
  let next

  if (type === "beta-next") {
    if (
      current.prerelease[0] === "beta" &&
      /^\d+$/.test(current.prerelease[1] ?? "") &&
      current.prerelease.length === 2
    ) {
      next = `${current.major}.${current.minor}.${current.patch}-beta.${Number(current.prerelease[1]) + 1}`
    } else if (current.prerelease.length === 0) {
      next = `${current.major}.${current.minor}.${current.patch + 1}-beta.0`
    } else {
      throw new Error(`beta-next requires a stable version or x.y.z-beta.N; current version is ${currentValue}`)
    }
  } else if (type === "promote-stable") {
    if (current.prerelease.length === 0) throw new Error(`${currentValue} is already stable`)
    next = `${current.major}.${current.minor}.${current.patch}`
  } else if (["patch", "minor", "major"].includes(type)) {
    if (current.prerelease.length > 0) {
      throw new Error(`${type} requires a stable current version; promote the prerelease first or use an explicit version`)
    }
    if (type === "patch") next = `${current.major}.${current.minor}.${current.patch + 1}`
    if (type === "minor") next = `${current.major}.${current.minor + 1}.0`
    if (type === "major") next = `${current.major + 1}.0.0`
  } else if (type === "explicit") {
    if (!explicitValue) throw new Error("explicit release type requires --version")
    parseVersion(explicitValue)
    next = explicitValue
  } else {
    throw new Error(`Unknown release type: ${type}`)
  }

  if (compareVersions(next, currentValue) <= 0) {
    throw new Error(`Release version ${next} must be greater than current version ${currentValue}`)
  }
  return next
}

export function updatePackageVersion(content, currentVersion, nextVersionValue) {
  const versionPattern = /(\"version\"\s*:\s*\")([^\"]+)(\")/
  const match = versionPattern.exec(content)
  if (!match) throw new Error(`${PACKAGE_JSON_PATH} does not contain a version field`)
  if (match[2] !== currentVersion) {
    throw new Error(`${PACKAGE_JSON_PATH} version ${match[2]} does not match parsed version ${currentVersion}`)
  }
  return content.replace(versionPattern, (_full, before, _current, after) => `${before}${nextVersionValue}${after}`)
}

function stripComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, "").trim()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function updateChangelog(content, version, date) {
  const heading = "## Unreleased"
  const start = content.indexOf(heading)
  if (start < 0) throw new Error("CHANGELOG.md must contain a '## Unreleased' heading")
  const bodyStart = start + heading.length
  const nextHeading = content.indexOf("\n## ", bodyStart)
  const bodyEnd = nextHeading < 0 ? content.length : nextHeading
  const notes = stripComments(content.slice(bodyStart, bodyEnd)) || "- No user-facing changes."
  const before = content.slice(0, start)
  const after = nextHeading < 0 ? "" : content.slice(nextHeading + 1).trimStart()
  const unreleased = `${heading}\n\n<!-- Add user-facing changes here before preparing a release. -->`
  const released = `## ${version} - ${date}\n\n${notes}`
  return `${before}${unreleased}\n\n${released}${after ? `\n\n${after}` : ""}\n`
}

export function releaseNotes(content, version) {
  const heading = new RegExp(`^## ${escapeRegExp(version)}(?: - [^\\n]+)?$`, "m").exec(content)
  if (!heading) throw new Error(`CHANGELOG.md does not contain a section for ${version}`)
  const bodyStart = heading.index + heading[0].length
  const nextHeading = content.indexOf("\n## ", bodyStart)
  const bodyEnd = nextHeading < 0 ? content.length : nextHeading
  const notes = stripComments(content.slice(bodyStart, bodyEnd))
  if (!notes) throw new Error(`CHANGELOG.md section for ${version} is empty`)
  return notes
}

function option(args, name) {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, { flag: "a" })
  }
}

function prepare(args) {
  const type = option(args, "--type")
  if (!type) throw new Error("prepare requires --type")
  const explicit = option(args, "--version")
  const packageJsonContent = readFileSync(PACKAGE_JSON_PATH, "utf8")
  const packageJson = JSON.parse(packageJsonContent)
  const version = nextVersion(packageJson.version, type, explicit)
  writeFileSync(PACKAGE_JSON_PATH, updatePackageVersion(packageJsonContent, packageJson.version, version))
  const date = new Date().toISOString().slice(0, 10)
  const changelog = readFileSync(CHANGELOG_PATH, "utf8")
  writeFileSync(CHANGELOG_PATH, updateChangelog(changelog, version, date))
  writeOutput("version", version)
  process.stdout.write(`${version}\n`)
}

function notes(args) {
  const version = option(args, "--version")
  if (!version) throw new Error("notes requires --version")
  process.stdout.write(`${releaseNotes(readFileSync(CHANGELOG_PATH, "utf8"), version)}\n`)
}

function assertNewer(args) {
  const from = option(args, "--from")
  const to = option(args, "--to")
  if (!from || !to) throw new Error("assert-newer requires --from and --to")
  if (compareVersions(to, from) <= 0) throw new Error(`Release version ${to} must be greater than ${from}`)
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (invoked) {
  try {
    const [command, ...args] = process.argv.slice(2)
    if (command === "prepare") prepare(args)
    else if (command === "notes") notes(args)
    else if (command === "assert-newer") assertNewer(args)
    else throw new Error(`Unknown release command: ${command ?? "<missing>"}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
