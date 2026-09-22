import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  framesPerSecond,
  median,
  type PresentationBenchmarkReport,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Native decode matrix requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-iosurface-decode-matrix")
const fixturePath = join(workDirectory, "fixture.mp4")
const baseEnv = {
  ...process.env,
  MEDIABUNNY_PRESENTATION_CODEC: "avc",
  MEDIABUNNY_PRESENTATION_ITERATIONS: process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? "5",
  MEDIABUNNY_PRESENTATION_WARMUPS: process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? "2",
}

type Variant = {
  key: string
  label: string
  env: Record<string, string>
}

const variants: Variant[] = [
  { key: "baseline", label: "baseline", env: {} },
  { key: "packet-view", label: "packet Buffer view", env: { GPUIX_MEDIA_PACKET_VIEW: "1" } },
  { key: "sync", label: "sync codec calls", env: { GPUIX_MEDIA_SYNC_CODEC_CALLS: "1" } },
  { key: "batch-2", label: "packet batch 2", env: { GPUIX_MEDIA_PACKET_BATCH: "2" } },
  { key: "batch-4", label: "packet batch 4", env: { GPUIX_MEDIA_PACKET_BATCH: "4" } },
  { key: "batch-8", label: "packet batch 8", env: { GPUIX_MEDIA_PACKET_BATCH: "8" } },
  { key: "batch-16", label: "packet batch 16", env: { GPUIX_MEDIA_PACKET_BATCH: "16" } },
  { key: "batch-40", label: "packet batch 40", env: { GPUIX_MEDIA_PACKET_BATCH: "40" } },
  {
    key: "batch-8-fast-first",
    label: "batch 8, fast first frame",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "8",
      GPUIX_MEDIA_FAST_FIRST_FRAME: "1",
    },
  },
  {
    key: "batch-40-fast-first",
    label: "batch 40, fast first frame",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "40",
      GPUIX_MEDIA_FAST_FIRST_FRAME: "1",
    },
  },
  { key: "extra-2", label: "+2 hardware frames", env: { GPUIX_MEDIA_EXTRA_HW_FRAMES: "2" } },
  {
    key: "batch-8-extra-2",
    label: "batch 8 +2 hardware frames",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "8",
      GPUIX_MEDIA_EXTRA_HW_FRAMES: "2",
    },
  },
]

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

async function runJson(
  script: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<PresentationBenchmarkReport> {
  const child = Bun.spawn([process.execPath, script, ...args], {
    cwd: projectDirectory,
    stdout: "pipe",
    stderr: "inherit",
    env: { ...baseEnv, ...env },
  })
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${script} exited with code ${exitCode}`)

  // SAFETY: repository benchmark children emit PresentationBenchmarkReport JSON, validated below.
  const report = JSON.parse(stdout) as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.workload.codec !== "avc") {
    throw new Error(`${script} returned an unsupported report`)
  }
  return report
}

function reportDecodeFps(report: PresentationBenchmarkReport): number {
  return median(report.decodeOnly.map(framesPerSecond))
}

function reportPresentationFps(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map(framesPerSecond))
}

function reportFirstFrameMs(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.firstFrameMs))
}

function reportP95Ms(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.frameStepP95Ms))
}

function receiveCallsPerFrame(report: PresentationBenchmarkReport): number {
  return median(report.decodeOnly.map((run) =>
    run.frames > 0 ? (run.nativeCodecReceiveCalls ?? 0) / run.frames : 0
  ))
}

function sendEagain(report: PresentationBenchmarkReport): number {
  return median(report.decodeOnly.map((run) => run.nativeCodecSendEagain ?? 0))
}

function ratio(value: number, baseline: number): string {
  return baseline <= 0 ? "n/a" : `${(value / baseline).toFixed(2)}x`
}

try {
  const fixture = Bun.spawn([process.execPath, "src/create-presentation-fixture.ts", fixturePath], {
    cwd: projectDirectory,
    stdout: "inherit",
    stderr: "inherit",
    env: baseEnv,
  })
  const fixtureExitCode = await fixture.exited
  if (fixtureExitCode !== 0) throw new Error(`AVC fixture generator exited with code ${fixtureExitCode}`)

  const browser = await runJson("src/run-presentation-browser.ts", [fixturePath])
  const browserDecodeFps = reportDecodeFps(browser)
  const browserPresentationFps = reportPresentationFps(browser)
  const browserFirstFrameMs = reportFirstFrameMs(browser)
  const browserP95Ms = reportP95Ms(browser)

  const results: Array<{ variant: Variant; report: PresentationBenchmarkReport }> = []
  for (const variant of variants) {
    const report = await runJson("src/run-presentation-iosurface-native.ts", [fixturePath], variant.env)
    results.push({ variant, report })
    await Bun.write(
      join(reportsDirectory, `presentation-iosurface-decode-${variant.key}.json`),
      JSON.stringify(report, null, 2) + "\n",
    )
  }

  const sample = results[0]?.report.endToEnd[0]
  if (!sample) throw new Error("Native decode matrix produced no measured runs")

  const lines = [
    "# Native decode experiment matrix",
    "",
    `AVC fixture: ${sample.width}×${sample.height}, ${sample.frames} frames. Browser decode: ${browserDecodeFps.toFixed(2)} fps. Browser presentation: ${browserPresentationFps.toFixed(2)} fps.`,
    "",
    "| Variant | Native decode | vs browser | Native presentation | vs browser | recv calls/frame | send EAGAIN | First frame | vs browser | p95 step | vs browser |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ]

  for (const { variant, report } of results) {
    const decodeFps = reportDecodeFps(report)
    const presentationFps = reportPresentationFps(report)
    const firstFrameMs = reportFirstFrameMs(report)
    const p95Ms = reportP95Ms(report)
    lines.push(
      `| ${variant.label} | ${decodeFps.toFixed(2)} fps | ${ratio(decodeFps, browserDecodeFps)} | ${presentationFps.toFixed(2)} fps | ${ratio(presentationFps, browserPresentationFps)} | ${receiveCallsPerFrame(report).toFixed(2)} | ${sendEagain(report).toFixed(0)} | ${firstFrameMs.toFixed(2)} ms | ${ratio(firstFrameMs, browserFirstFrameMs)} | ${p95Ms.toFixed(2)} ms | ${ratio(p95Ms, browserP95Ms)} |`,
    )
  }

  lines.push(
    "",
    "Throughput ratios above 1 beat the browser. First-frame and p95 ratios below 1 beat the browser.",
    "",
    "The baseline keeps the current one-packet-at-a-time decode loop. Queue-depth rows extend through 40 packets because MediaBunny's browser pump permits up to 40 queued packets while no decoded samples are waiting. Fast-first-frame rows drain until the first decoded frame before switching to the deeper steady-state queue.",
    "",
  )

  const summary = lines.join("\n")
  await Bun.write(
    join(reportsDirectory, "presentation-iosurface-decode-matrix.md"),
    summary + "\n",
  )
  console.log(summary)
  console.log("")
  console.log("Reports written to examples/mediabunny/reports/presentation-iosurface-decode-*")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
