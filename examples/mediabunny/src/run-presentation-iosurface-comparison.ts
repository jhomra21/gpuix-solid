import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  formatPresentationComparison,
  type PresentationBenchmarkReport,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("IOSurface presentation benchmark requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-iosurface-benchmark")
const fixturePath = join(workDirectory, "fixture.mp4")
const benchmarkEnv = {
  ...process.env,
  MEDIABUNNY_PRESENTATION_CODEC: "avc",
}

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

async function runJson(script: string, args: string[] = []): Promise<PresentationBenchmarkReport> {
  const child = Bun.spawn([process.execPath, script, ...args], {
    cwd: projectDirectory,
    stdout: "pipe",
    stderr: "inherit",
    env: benchmarkEnv,
  })
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${script} exited with code ${exitCode}`)

  const raw = JSON.parse(stdout)
  // SAFETY: these repository benchmark children emit PresentationBenchmarkReport JSON, checked below.
  const report = raw as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.workload.codec !== "avc") {
    throw new Error(`${script} returned an unsupported report`)
  }
  return report
}

try {
  const fixture = Bun.spawn([process.execPath, "src/create-presentation-fixture.ts", fixturePath], {
    cwd: projectDirectory,
    stdout: "inherit",
    stderr: "inherit",
    env: benchmarkEnv,
  })
  const fixtureExitCode = await fixture.exited
  if (fixtureExitCode !== 0) throw new Error(`AVC fixture generator exited with code ${fixtureExitCode}`)

  const browser = await runJson("src/run-presentation-browser.ts", [fixturePath])
  const native = await runJson("src/run-presentation-iosurface-native.ts", [fixturePath])
  const comparison = formatPresentationComparison(browser, native)

  await Bun.write(
    join(reportsDirectory, "presentation-iosurface-browser.json"),
    JSON.stringify(browser, null, 2) + "\n",
  )
  await Bun.write(
    join(reportsDirectory, "presentation-iosurface-gpuix.json"),
    JSON.stringify(native, null, 2) + "\n",
  )
  await Bun.write(
    join(reportsDirectory, "presentation-iosurface-comparison.md"),
    comparison + "\n",
  )

  console.log(comparison)
  console.log("")
  console.log("Reports written to examples/mediabunny/reports/presentation-iosurface-*.{json,md}")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
