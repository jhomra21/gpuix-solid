import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { provenancePolicy } from "./release-policy.mjs"
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

test("allows missing provenance only for the one-time unscoped beta.4 bootstrap", () => {
  assert.equal(provenancePolicy("gpuix-solid", "0.1.0-beta.4").required, false)
  assert.equal(provenancePolicy("gpuix-solid", "0.1.0-beta.5").required, true)
  assert.equal(provenancePolicy("gpuix-solid", "0.1.0").required, true)
  assert.equal(provenancePolicy("@jhomra21/gpuix-solid", "0.1.0-beta.4").required, true)
})

test("release preparation keeps the merged-PR publish trigger runnable", () => {
  const workflow = readFileSync(new URL("../.github/workflows/prepare-release.yml", import.meta.url), "utf8")
  assert.doesNotMatch(workflow, /\[skip ci\]/i)
  assert.match(workflow, /git commit -m "release: v\$\{VERSION\}"/)
})

test("release preparation retains the branch if Actions cannot open a PR", () => {
  const workflow = readFileSync(new URL("../.github/workflows/prepare-release.yml", import.meta.url), "utf8")
  assert.match(workflow, /gh pr create/)
  assert.match(workflow, /Release PR requires manual creation/)
  assert.match(workflow, /prepared branch was retained/i)
  assert.doesNotMatch(workflow, /git push origin --delete/)
})

test("release preparation can safely reuse an abandoned release branch", () => {
  const workflow = readFileSync(new URL("../.github/workflows/prepare-release.yml", import.meta.url), "utf8")
  assert.match(workflow, /existing_sha=\$\(git ls-remote origin/)
  assert.match(workflow, /--force-with-lease="refs\/heads\/\$\{branch\}:\$\{existing_sha\}"/)
  assert.match(workflow, /--state closed/)
  assert.match(workflow, /--json number,mergedAt/)
  assert.match(workflow, /gh pr reopen "\$existing_pr"/)
})

test("publish waits for npm integrity and dist-tag propagation", () => {
  const workflow = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8")
  assert.match(workflow, /deadline=\$\(\(SECONDS \+ 300\)\)/)
  assert.match(workflow, /"dist-tags\.\$\{expected_tag\}"/)
  assert.match(workflow, /remote_integrity.*!=.*INTEGRITY/)
  assert.doesNotMatch(workflow, /seq 1 12/)
})

test("publish packaging is idempotent after the version reaches npm", () => {
  const workflow = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8")
  const packStep = workflow.slice(
    workflow.indexOf("      - name: Pack exact publish candidate"),
    workflow.indexOf("      - name: Upload publish candidate"),
  )

  assert.match(packStep, /npm view "\$\{package\}@\$\{version\}" dist\.integrity/)
  assert.match(packStep, /remote_integrity.*!=.*integrity/)
  assert.match(packStep, /already exists with matching integrity; skipping publish dry-run/)
  assert.ok(packStep.indexOf("remote_integrity=$(npm view") < packStep.indexOf('npm publish "$tarball" --dry-run'))
})
