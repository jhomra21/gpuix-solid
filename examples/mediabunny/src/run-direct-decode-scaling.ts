import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  framesPerSecond,
  median,
  type DirectDecodeReport,
} from "./direct-decode-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Direct decoder scaling benchmark requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".direct-decode-scaling")
const resolutions = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
] as const

const codec = process.env.MEDIABUNNY_PRESENTATION_CODEC === "hevc" ? "hevc" : "avc"

const baseEnv = {
  ...process.env,
  MEDIABUNNY_PRESENTATION_CODEC: codec,
  MEDIABUNNY_PRESENTATION_ITERATIONS: process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? "5",
  MEDIABUNNY_PRESENTATION_WARMUPS: process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? "2",
}

function reportFps(report: DirectDecodeReport): number {
  return median(report.runs.map(framesPerSecond))
}

function firstFrameMs(report: DirectDecodeReport): number {
  return median(report.runs.map((run) => run.firstFrameMs))
}

function outputSpacingP95Ms(report: DirectDecodeReport): number {
  return median(report.runs.map((run) => run.frameStepP95Ms))
}

function ratio(value: number, baseline: number): number {
  return baseline <= 0 ? Number.NaN : value / baseline
}

function formatRatio(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "n/a"
}

async function runJson(
  script: string,
  fixturePath: string,
  env: Record<string, string>,
): Promise<DirectDecodeReport> {
  const child = Bun.spawn([process.execPath, script, fixturePath], {
    cwd: projectDirectory,
    stdout: "pipe",
    stderr: "inherit",
    env,
  })
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${script} exited with code ${exitCode}`)

  // SAFETY: repository benchmark children emit DirectDecodeReport JSON; the version/backend checks below reject unrelated output.
  const report = JSON.parse(stdout) as DirectDecodeReport
  if (
    report.schemaVersion !== 1
    || report.workload.codec !== codec
    || !["browser-webcodecs-direct", "videotoolbox-direct"].includes(report.backend)
  ) {
    throw new Error(`${script} returned an unsupported direct decode report`)
  }
  return report
}

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

const rows: string[] = []
const stageRows: string[] = []
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
      throw new Error(`${resolution.label} ${codec.toUpperCase()} fixture generator exited with code ${fixtureExitCode}`)
    }

    const browser = await runJson(
      "src/run-direct-decode-browser-external.ts",
      fixturePath,
      env,
    )
    const native = await runJson(
      "src/run-direct-decode-videotoolbox.ts",
      fixturePath,
      env,
    )

    const frameCounts = [
      ...browser.runs.map((run) => run.frames),
      ...native.runs.map((run) => run.frames),
    ]
    if (new Set(frameCounts).size !== 1) {
      throw new Error(
        `${resolution.label} direct decode frame counts differ: ${frameCounts.join(", ")}`,
      )
    }

    await Bun.write(
      join(reportsDirectory, `direct-decode-${key}-browser.json`),
      JSON.stringify(browser, null, 2) + "\n",
    )
    await Bun.write(
      join(reportsDirectory, `direct-decode-${key}-videotoolbox.json`),
      JSON.stringify(native, null, 2) + "\n",
    )

    const browserFps = reportFps(browser)
    const nativeFps = reportFps(native)
    const browserFirst = firstFrameMs(browser)
    const nativeFirst = firstFrameMs(native)
    const browserP95 = outputSpacingP95Ms(browser)
    const nativeP95 = outputSpacingP95Ms(native)
    const decodeRatio = ratio(nativeFps, browserFps)
    const firstRatio = ratio(nativeFirst, browserFirst)

    decodeRatios.push(decodeRatio)
    firstFrameRatios.push(firstRatio)

    rows.push(
      `| ${resolution.label} | ${browserFps.toFixed(2)} fps | ${nativeFps.toFixed(2)} fps | ${formatRatio(decodeRatio)} | ${browserFirst.toFixed(2)} ms | ${nativeFirst.toFixed(2)} ms | ${formatRatio(firstRatio)} | ${browserP95.toFixed(2)} ms | ${nativeP95.toFixed(2)} ms |`,
    )

    const packetParseMs = median(native.runs.map((run) => run.nativePacketParseMs ?? 0))
    const sampleBuildMs = median(native.runs.map((run) => run.nativeSampleBuildMs ?? 0))
    const submitMs = median(native.runs.map((run) => run.nativeSubmitMs ?? 0))
    const waitMs = median(native.runs.map((run) => run.nativeWaitMs ?? 0))
    stageRows.push(
      `| ${resolution.label} | ${packetParseMs.toFixed(2)} ms | ${sampleBuildMs.toFixed(2)} ms | ${submitMs.toFixed(2)} ms | ${waitMs.toFixed(2)} ms |`,
    )
  }

  const worstDecode = Math.min(...decodeRatios)
  const worstFirstFrame = Math.max(...firstFrameRatios)
  const winsPrimaryMetrics = worstDecode > 1 && worstFirstFrame < 1

  const report = [
    `# Direct ${codec.toUpperCase()} decoder scaling`,
    "",
    `Both sides exclude MediaBunny packet preparation from timing. Browser ${codec.toUpperCase()} packets feed WebCodecs directly; native packets cross N-API once per run and feed VideoToolbox directly without FFmpeg or NodeAV in the decode hot loop.`,
    "",
    "| Resolution | Browser WebCodecs | Direct VideoToolbox | Native / browser | Browser first frame | Native first frame | Native / browser | Browser output-spacing p95 | Native output-spacing p95 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    `Worst decode-throughput ratio: ${formatRatio(worstDecode)}. Worst first-frame ratio: ${formatRatio(worstFirstFrame)}. Native wins both primary decoder metrics at every resolution: ${winsPrimaryMetrics ? "yes" : "no"}.`,
    "",
    "Throughput above 1x is faster natively. First-frame latency below 1x is faster natively.",
    "",
    "Output-spacing p95 is diagnostic only. It measures spacing between asynchronous output callbacks and is not per-frame decode latency; queued decoders may deliver frames in bursts.",
    "",
    "## Direct VideoToolbox native stage medians",
    "",
    "| Resolution | N-API packet parse | CoreMedia sample build | VT submit calls | Finish + async wait |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...stageRows,
    "",
    "The outer throughput timer includes the complete N-API call. Stage timers are diagnostic and omit small return-object and cleanup costs, so they do not need to sum exactly to total time.",
    "",
  ].join("\n")

  await Bun.write(
    join(reportsDirectory, `direct-decode-${codec}-scaling.md`),
    report + "\n",
  )

  console.log(report)
  console.log(`Reports written to examples/mediabunny/reports/direct-decode-${codec}-*`)
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
