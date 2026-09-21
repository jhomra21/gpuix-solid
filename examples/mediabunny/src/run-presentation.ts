import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  formatPresentationComparison,
  type PresentationBenchmarkReport,
} from "./presentation-report.ts"

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-benchmark")
const fixturePath = join(workDirectory, "fixture.webm")

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

async function runJson(script: string, args: string[] = []): Promise<PresentationBenchmarkReport> {
  const child = Bun.spawn([process.execPath, script, ...args], {
    cwd: projectDirectory,
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  })
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${script} exited with code ${exitCode}`)

  const raw = JSON.parse(stdout)
  const report = raw as PresentationBenchmarkReport
  if (report.schemaVersion !== 1) throw new Error(`${script} returned an unsupported report`)
  return report
}

try {
  const fixture = Bun.spawn([process.execPath, "src/create-presentation-fixture.ts", fixturePath], {
    cwd: projectDirectory,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  })
  const fixtureExitCode = await fixture.exited
  if (fixtureExitCode !== 0) throw new Error(`Presentation fixture generator exited with code ${fixtureExitCode}`)

  const browser = await runJson("src/run-presentation-browser.ts", [fixturePath])
  const native = await runJson("src/run-presentation-native.ts", [fixturePath])
  const comparison = formatPresentationComparison(browser, native)

  await Bun.write(
    join(reportsDirectory, "presentation-browser.json"),
    JSON.stringify(browser, null, 2) + "\n",
  )
  await Bun.write(
    join(reportsDirectory, "presentation-gpuix.json"),
    JSON.stringify(native, null, 2) + "\n",
  )
  await Bun.write(
    join(reportsDirectory, "presentation-comparison.md"),
    comparison + "\n",
  )

  console.log(comparison)
  console.log("")
  console.log("Reports written to examples/mediabunny/reports/presentation-*.{json,md}")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
