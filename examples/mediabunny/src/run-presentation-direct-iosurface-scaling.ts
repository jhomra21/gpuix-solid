import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  framesPerSecond,
  median,
  steadyStateFramesPerSecond,
  type PresentationBenchmarkReport,
  type PresentationRun,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Direct IOSurface presentation scaling requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-direct-iosurface-scaling")
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

function ratio(value: number, baseline: number): number {
  return baseline <= 0 ? Number.NaN : value / baseline
}

function formatRatio(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "n/a"
}

function decodeFps(report: PresentationBenchmarkReport): number {
  return median(report.decodeOnly.map(framesPerSecond))
}

function presentationFps(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map(framesPerSecond))
}

function steadyFps(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map(steadyStateFramesPerSecond))
}

function firstFrameMs(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.firstFrameMs))
}

function presentationP95Ms(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.frameStepP95Ms))
}

function stageMs(
  runs: readonly PresentationRun[],
  key: "decodeMs" | "uploadMs" | "renderFlushMs",
): number {
  return median(runs.map((run) => run[key] ?? 0))
}

async function runJson(
  script: string,
  fixturePath: string,
  env: Record<string, string>,
): Promise<PresentationBenchmarkReport> {
  const child = Bun.spawn([process.execPath, script, fixturePath], {
    cwd: projectDirectory,
    stdout: "pipe",
    stderr: "inherit",
    env,
  })
  const stdout = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`${script} exited with code ${exitCode}`)
  }

  // SAFETY: repository benchmark children emit PresentationBenchmarkReport JSON; the checks below reject unrelated output.
  const report = JSON.parse(stdout) as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.workload.codec !== "avc") {
    throw new Error(`${script} returned an unsupported presentation report`)
  }
  return report
}

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

const rows: string[] = []
const stageRows: string[] = []
const decodeRatios: number[] = []
const presentationRatios: number[] = []
const firstFrameRatios: number[] = []
const p95Ratios: number[] = []

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

    const browser = await runJson(
      "src/run-presentation-browser-external.ts",
      fixturePath,
      env,
    )
    if (browser.backend !== "browser-webcodecs-canvas") {
      throw new Error(`${resolution.label} browser path returned ${browser.backend}`)
    }

    const native = await runJson(
      "src/run-presentation-direct-videotoolbox-native.ts",
      fixturePath,
      env,
    )
    if (native.backend !== "direct-videotoolbox-iosurface-gpuix-video-frame") {
      throw new Error(`${resolution.label} native path returned ${native.backend}`)
    }

    const allFrameCounts = [
      ...browser.decodeOnly.map((run) => run.frames),
      ...browser.endToEnd.map((run) => run.frames),
      ...native.decodeOnly.map((run) => run.frames),
      ...native.endToEnd.map((run) => run.frames),
    ]
    if (new Set(allFrameCounts).size !== 1) {
      throw new Error(
        `${resolution.label} presentation frame counts differ: ${allFrameCounts.join(", ")}`,
      )
    }

    await Bun.write(
      join(reportsDirectory, `presentation-direct-iosurface-${key}-browser.json`),
      JSON.stringify(browser, null, 2) + "\n",
    )
    await Bun.write(
      join(reportsDirectory, `presentation-direct-iosurface-${key}-gpuix.json`),
      JSON.stringify(native, null, 2) + "\n",
    )

    const browserDecode = decodeFps(browser)
    const nativeDecode = decodeFps(native)
    const browserPresentation = presentationFps(browser)
    const nativePresentation = presentationFps(native)
    const browserSteady = steadyFps(browser)
    const nativeSteady = steadyFps(native)
    const browserFirst = firstFrameMs(browser)
    const nativeFirst = firstFrameMs(native)
    const browserP95 = presentationP95Ms(browser)
    const nativeP95 = presentationP95Ms(native)

    const decodeRatio = ratio(nativeDecode, browserDecode)
    const presentationRatio = ratio(nativePresentation, browserPresentation)
    const firstRatio = ratio(nativeFirst, browserFirst)
    const p95Ratio = ratio(nativeP95, browserP95)

    decodeRatios.push(decodeRatio)
    presentationRatios.push(presentationRatio)
    firstFrameRatios.push(firstRatio)
    p95Ratios.push(p95Ratio)

    rows.push(
      `| ${resolution.label} | ${browserDecode.toFixed(2)} / ${nativeDecode.toFixed(2)} fps | ${formatRatio(decodeRatio)} | ${browserPresentation.toFixed(2)} / ${nativePresentation.toFixed(2)} fps | ${formatRatio(presentationRatio)} | ${browserSteady.toFixed(2)} / ${nativeSteady.toFixed(2)} fps | ${browserFirst.toFixed(2)} / ${nativeFirst.toFixed(2)} ms | ${formatRatio(firstRatio)} | ${browserP95.toFixed(2)} / ${nativeP95.toFixed(2)} ms | ${formatRatio(p95Ratio)} |`,
    )

    stageRows.push(
      `| ${resolution.label} | ${stageMs(native.endToEnd, "decodeMs").toFixed(2)} ms | ${stageMs(native.endToEnd, "uploadMs").toFixed(2)} ms | ${stageMs(native.endToEnd, "renderFlushMs").toFixed(2)} ms |`,
    )
  }

  const worstDecode = Math.min(...decodeRatios)
  const worstPresentation = Math.min(...presentationRatios)
  const worstFirstFrame = Math.max(...firstFrameRatios)
  const worstP95 = Math.max(...p95Ratios)
  const winsEverywhere =
    worstDecode > 1
    && worstPresentation > 1
    && worstFirstFrame < 1
    && worstP95 < 1

  const report = [
    "# Direct VideoToolbox IOSurface presentation scaling",
    "",
    "Browser uses MediaBunny CanvasSink with browser WebCodecs. Native uses MediaBunny encoded-packet iteration, direct hardware VideoToolbox decode, bounded retained CVPixelBuffer batches, IOSurface handoff, and GPUix/GPUI presentation. The first native packet batch is one packet for low first-frame latency; steady state defaults to eight packets per retained frame batch.",
    "",
    "| Resolution | Decode browser / native | Native / browser | Presentation browser / native | Native / browser | Steady browser / native | First frame browser / native | Native / browser | Presentation p95 browser / native | Native / browser |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    `Worst decode ratio: ${formatRatio(worstDecode)}. Worst presentation ratio: ${formatRatio(worstPresentation)}. Worst first-frame ratio: ${formatRatio(worstFirstFrame)}. Worst presentation-p95 ratio: ${formatRatio(worstP95)}. Native wins all four metrics at every resolution: ${winsEverywhere ? "yes" : "no"}.`,
    "",
    "Throughput ratios above 1x are faster natively. First-frame and presentation-p95 ratios below 1x are faster natively.",
    "",
    "## Native stage medians",
    "",
    "| Resolution | Direct decode batches | GPUix IOSurface handoff | GPUI render flush |",
    "| --- | ---: | ---: | ---: |",
    ...stageRows,
    "",
    "Decode includes the complete synchronous N-API batch calls, including native packet parsing, CoreMedia sample construction, VideoToolbox submission/wait, retaining decoded CVPixelBuffers, sorting by presentation timestamp, and exporting IOSurface pointer handles. GPUix handoff and render flush are measured separately.",
    "",
  ].join("\n")

  await Bun.write(
    join(reportsDirectory, "presentation-direct-iosurface-scaling.md"),
    report + "\n",
  )

  console.log(report)
  console.log("Reports written to examples/mediabunny/reports/presentation-direct-iosurface-*")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
