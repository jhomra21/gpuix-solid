import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  framesPerSecond,
  median,
  type PresentationBenchmarkReport,
  type PresentationRun,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("napi-WebCodecs decode scaling benchmark requires macOS")
}

type DecodeWorkerReport = {
  schemaVersion: 1
  backend: "napi-webcodecs-worker"
  generatedAt: string
  workload: {
    codec: "avc"
    fixtureBytes: number
    warmups: number
    iterations: number
  }
  decodeOnly: PresentationRun[]
  verification: Record<string, string | number | boolean>
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-napi-webcodecs-decode")
const resolutions = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
] as const

const baseEnv = {
  ...process.env,
  MEDIABUNNY_PRESENTATION_CODEC: "avc",
  MEDIABUNNY_PRESENTATION_ITERATIONS: process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? "5",
  MEDIABUNNY_PRESENTATION_WARMUPS: process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? "2",
}

function decodeFps(runs: readonly PresentationRun[]): number {
  return median(runs.map(framesPerSecond))
}

function firstFrameMs(runs: readonly PresentationRun[]): number {
  return median(runs.map((run) => run.firstFrameMs))
}

function outputSpacingP95Ms(runs: readonly PresentationRun[]): number {
  return median(runs.map((run) => run.frameStepP95Ms))
}

function ratio(value: number, baseline: number): number {
  return baseline <= 0 ? Number.NaN : value / baseline
}

function formatRatio(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "n/a"
}

async function runBrowser(
  fixturePath: string,
  env: Record<string, string>,
): Promise<PresentationBenchmarkReport> {
  const child = Bun.spawn(
    [process.execPath, "src/run-presentation-browser-external.ts", fixturePath],
    {
      cwd: projectDirectory,
      stdout: "pipe",
      stderr: "inherit",
      env,
    },
  )
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`External browser decode benchmark exited with code ${exitCode}`)
  }

  // SAFETY: this child runs the repository browser benchmark; the schema/backend checks below reject mismatched output.
  const report = JSON.parse(stdout) as PresentationBenchmarkReport
  if (
    report.schemaVersion !== 2
    || report.backend !== "browser-webcodecs-canvas"
    || report.workload.codec !== "avc"
  ) {
    throw new Error("Browser decode benchmark returned an unsupported report")
  }
  return report
}

async function runWorker(
  fixturePath: string,
  env: Record<string, string>,
): Promise<DecodeWorkerReport> {
  const child = Bun.spawn(
    [process.execPath, "src/run-presentation-napi-webcodecs-decode.ts", fixturePath],
    {
      cwd: projectDirectory,
      stdout: "pipe",
      stderr: "inherit",
      env,
    },
  )
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`napi-WebCodecs worker benchmark exited with code ${exitCode}`)
  }

  // SAFETY: this child runs the repository worker benchmark; the schema/backend checks below reject mismatched output.
  const report = JSON.parse(stdout) as DecodeWorkerReport
  if (
    report.schemaVersion !== 1
    || report.backend !== "napi-webcodecs-worker"
    || report.workload.codec !== "avc"
  ) {
    throw new Error("napi-WebCodecs worker benchmark returned an unsupported report")
  }
  return report
}

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

const rows: string[] = []
const decodeRatios: number[] = []
const firstFrameRatios: number[] = []

try {
  for (const resolution of resolutions) {
    const key = `${resolution.width}x${resolution.height}`
    const fixturePath = join(workDirectory, `fixture-${key}.mp4`)
    const env = {
      ...baseEnv,
      MEDIABUNNY_PRESENTATION_WIDTH: String(resolution.width),
      MEDIABUNNY_PRESENTATION_HEIGHT: String(resolution.height),
    }

    const fixture = Bun.spawn(
      [process.execPath, "src/create-presentation-fixture.ts", fixturePath],
      {
        cwd: projectDirectory,
        stdout: "inherit",
        stderr: "inherit",
        env,
      },
    )
    const fixtureExitCode = await fixture.exited
    if (fixtureExitCode !== 0) {
      throw new Error(`${resolution.label} AVC fixture generator exited with code ${fixtureExitCode}`)
    }

    const browser = await runBrowser(fixturePath, env)
    const worker = await runWorker(fixturePath, env)

    const browserFrames = browser.decodeOnly.map((run) => run.frames)
    const workerFrames = worker.decodeOnly.map((run) => run.frames)
    if (new Set([...browserFrames, ...workerFrames]).size !== 1) {
      throw new Error(
        `${resolution.label} frame counts differ: browser=${browserFrames.join(",")} worker=${workerFrames.join(",")}`,
      )
    }

    await Bun.write(
      join(reportsDirectory, `presentation-napi-webcodecs-decode-${key}-browser.json`),
      JSON.stringify(browser, null, 2) + "\n",
    )
    await Bun.write(
      join(reportsDirectory, `presentation-napi-webcodecs-decode-${key}-worker.json`),
      JSON.stringify(worker, null, 2) + "\n",
    )

    const browserDecode = decodeFps(browser.decodeOnly)
    const workerDecode = decodeFps(worker.decodeOnly)
    const browserFirst = firstFrameMs(browser.decodeOnly)
    const workerFirst = firstFrameMs(worker.decodeOnly)
    const browserP95 = outputSpacingP95Ms(browser.decodeOnly)
    const workerP95 = outputSpacingP95Ms(worker.decodeOnly)
    const decodeRatio = ratio(workerDecode, browserDecode)
    const firstRatio = ratio(workerFirst, browserFirst)

    decodeRatios.push(decodeRatio)
    firstFrameRatios.push(firstRatio)

    rows.push(
      `| ${resolution.label} | ${browserDecode.toFixed(2)} fps | ${workerDecode.toFixed(2)} fps | ${formatRatio(decodeRatio)} | ${browserFirst.toFixed(2)} ms | ${workerFirst.toFixed(2)} ms | ${formatRatio(firstRatio)} | ${browserP95.toFixed(2)} ms | ${workerP95.toFixed(2)} ms |`,
    )
  }

  const worstDecode = Math.min(...decodeRatios)
  const worstFirstFrame = Math.max(...firstFrameRatios)
  const winsPrimaryMetrics = worstDecode > 1 && worstFirstFrame < 1

  const report = [
    "# napi-WebCodecs worker decode scaling",
    "",
    "Chromium uses MediaBunny with browser WebCodecs. The native path feeds the same MediaBunny AVC packets into @napi-rs/webcodecs, whose VideoDecoder owns a persistent decoder worker thread.",
    "",
    "| Resolution | Browser decode | Native worker decode | Worker / browser | Browser first frame | Native first frame | Worker / browser | Browser output-spacing p95 | Worker output-spacing p95 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    `Worst decode ratio: ${formatRatio(worstDecode)}. Worst first-frame ratio: ${formatRatio(worstFirstFrame)}. Worker wins both primary decoder metrics at every resolution: ${winsPrimaryMetrics ? "yes" : "no"}.`,
    "",
    "Throughput ratios above 1 beat the browser. First-frame latency ratios below 1 beat the browser.",
    "",
    "Output-spacing p95 is diagnostic only. It measures spacing between asynchronous output callbacks, not per-frame decode time. The worker can deliver frames in a burst after a long first-frame wait, so this value must not be used as a decoder-latency win condition.",
    "",
    "This experiment is a negative architecture result for the current @napi-rs/webcodecs path: it downloads hardware-decoded frames to CPU memory before exposing VideoFrame, and the persistent worker did not close the browser throughput or first-frame gap. The next experiment bypasses that download and the NodeAV/FFmpeg hot loop by feeding the same pre-collected AVC packets directly to VideoToolbox.",
    "",
  ].join("\n")

  await Bun.write(
    join(reportsDirectory, "presentation-napi-webcodecs-decode-scaling.md"),
    report + "\n",
  )

  console.log(report)
  console.log("Reports written to examples/mediabunny/reports/presentation-napi-webcodecs-decode-*")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
