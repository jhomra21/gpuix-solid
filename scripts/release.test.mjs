import assert from "node:assert/strict"
import test from "node:test"
import {
  compareVersions,
  nextVersion,
  parseVersion,
  releaseNotes,
  updateChangelog,
  updatePackageVersion,
} from "./release.mjs"

test("parses and compares prerelease semver", () => {
  assert.equal(parseVersion("0.1.0-beta.9").prerelease.join("."), "beta.9")
  assert.equal(compareVersions("0.1.0-beta.9", "0.1.0-beta.8"), 1)
  assert.equal(compareVersions("0.1.0", "0.1.0-beta.9"), 1)
  assert.equal(compareVersions("0.1.0-beta.9", "0.1.0"), -1)
  assert.throws(() => parseVersion("0.1.0-beta.01"), /leading zero/)
})

test("computes beta and stable release transitions", () => {
  assert.equal(nextVersion("0.1.0-beta.0", "beta-next"), "0.1.0-beta.1")
  assert.equal(nextVersion("0.1.0-beta.9", "promote-stable"), "0.1.0")
  assert.equal(nextVersion("0.1.0", "beta-next"), "0.1.1-beta.0")
  assert.equal(nextVersion("0.1.0", "patch"), "0.1.1")
  assert.equal(nextVersion("0.1.0", "minor"), "0.2.0")
  assert.equal(nextVersion("0.1.0", "major"), "1.0.0")
  assert.equal(nextVersion("0.1.0-beta.0", "explicit", "0.2.0-beta.0"), "0.2.0-beta.0")
  assert.throws(() => nextVersion("0.1.0-beta.0", "patch"), /requires a stable current version/)
  assert.throws(() => nextVersion("0.1.0", "promote-stable"), /already stable/)
})

test("updates only the package version field", () => {
  const before = '{\n  "name": "pkg",\n  "version": "0.1.0-beta.0",\n  "description": "v0.1.0-beta.0 docs"\n}\n'
  const after = updatePackageVersion(before, "0.1.0-beta.0", "0.1.0-beta.1")
  assert.match(after, /"version": "0\.1\.0-beta\.1"/)
  assert.match(after, /"description": "v0\.1\.0-beta\.0 docs"/)
})

test("moves Unreleased notes into an immutable version section", () => {
  const before = `# Changelog\n\n## Unreleased\n\n- New thing.\n\n## 0.1.0-beta.0 - 2026-08-24\n\n- Initial beta.\n`
  const after = updateChangelog(before, "0.1.0-beta.1", "2026-08-25")
  assert.match(after, /## Unreleased\n\n<!-- Add user-facing changes here before preparing a release\. -->/)
  assert.match(after, /## 0\.1\.0-beta\.1 - 2026-08-25\n\n- New thing\./)
  assert.equal(releaseNotes(after, "0.1.0-beta.1"), "- New thing.")
  assert.equal(releaseNotes(after, "0.1.0-beta.0"), "- Initial beta.")
})
