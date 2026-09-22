import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  framesPerSecond,
  median,
  steadyStateFramesPerSecond,
  type PresentationBenchmarkReport,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Direct IOSurface batch matrix requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-direct-iosurface-batch-matrix")
const batchSizes = [1, 2, 4, 8] as const
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

  // SAFETY: repository benchmark children emit PresentationBenchmarkReport JSON; the schema/backend checks below reject unrelated output.
  const report = JSON.parse(stdout) as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.workload.codec !== "avc") {
    throw new Error(`${script} returned an unsupported presentation report`)
  }
  return report
}

await rm(workDirectory, { recursive: true, force: true })
await mkdir(workDirectory, { recursive: true })
await mkdir(reportsDirectory, { recursive: true })

const detailRows: string[] = []
const scoreRows: string[] = []
const scoreByBatch = new Map<number, {
  decode: number[]
  presentation: number[]
  firstFrame: number[]
  p95: number[]
}>()

for (const batchSize of batchSizes) {
  scoreByBatch.set(batchSize, {
    decode: [],
    presentation: [],
    firstFrame: [],
    p95: [],
  })
}

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

    await Bun.write(
      join(reportsDirectory, `presentation-direct-iosurface-batch-${key}-browser.json`),
      JSON.stringify(browser, null, 2) + "\n",
    )

    const browserDecode = decodeFps(browser)
    const browserPresentation = presentationFps(browser)
    const browserSteady = steadyFps(browser)
    const browserFirst = firstFrameMs(browser)
    const browserP95 = presentationP95Ms(browser)

    for (const batchSize of batchSizes) {
      const native = await runJson(
        "src/run-presentation-direct-videotoolbox-native.ts",
        fixturePath,
        {
          ...env,
          GPUIX_MEDIA_DIRECT_FRAME_BATCH: String(batchSize),
        },
      )
      if (native.backend !== "direct-videotoolbox-iosurface-gpuix-video-frame") {
        throw new Error(
          `${resolution.label} batch ${batchSize} native path returned ${native.backend}`,
        )
      }

      const counts = [
        ...browser.decodeOnly.map((run) => run.frames),
        ...browser.endToEnd.map((run) => run.frames),
        ...native.decodeOnly.map((run) => run.frames),
        ...native.endToEnd.map((run) => run.frames),
      ]
      if (new Set(counts).size !== 1) {
        throw new Error(
          `${resolution.label} batch ${batchSize} frame counts differ: ${counts.join(", ")}`,
        )
      }

      await Bun.write(
        join(
          reportsDirectory,
          `presentation-direct-iosurface-batch-${key}-b${batchSize}-gpuix.json`,
        ),
        JSON.stringify(native, null, 2) + "\n",
      )

      const nativeDecode = decodeFps(native)
      const nativePresentation = presentationFps(native)
      const nativeSteady = steadyFps(native)
      const nativeFirst = firstFrameMs(native)
      const nativeP95 = presentationP95Ms(native)

      const decodeRatio = ratio(nativeDecode, browserDecode)
      const presentationRatio = ratio(nativePresentation, browserPresentation)
      const firstFrameRatio = ratio(nativeFirst, browserFirst)
      const p95Ratio = ratio(nativeP95, browserP95)

      const score = scoreByBatch.get(batchSize)
      if (!score) throw new Error(`Missing score accumulator for batch ${batchSize}`)
      score.decode.push(decodeRatio)
      score.presentation.push(presentationRatio)
      score.firstFrame.push(firstFrameRatio)
      score.p95.push(p95Ratio)

      detailRows.push(
        `| ${resolution.label} | ${batchSize} | ${nativeDecode.toFixed(2)} fps | ${formatRatio(decodeRatio)} | ${nativePresentation.toFixed(2)} fps | ${formatRatio(presentationRatio)} | ${nativeSteady.toFixed(2)} / ${browserSteady.toFixed(2)} fps | ${nativeFirst.toFixed(2)} / ${browserFirst.toFixed(2)} ms | ${formatRatio(firstFrameRatio)} | ${nativeP95.toFixed(2)} / ${browserP95.toFixed(2)} ms | ${formatRatio(p95Ratio)} |`,
      )
    }
  }

  for (const batchSize of batchSizes) {
    const score = scoreByBatch.get(batchSize)
    if (!score) continue

    const worstDecode = Math.min(...score.decode)
    const worstPresentation = Math.min(...score.presentation)
    const worstFirstFrame = Math.max(...score.firstFrame)
    const worstP95 = Math.max(...score.p95)
    const cleanWin =
      worstDecode > 1
      && worstPresentation > 1
      && worstFirstFrame < 1
      && worstP95 < 1

    scoreRows.push(
      `| ${batchSize} | ${formatRatio(worstDecode)} | ${formatRatio(worstPresentation)} | ${formatRatio(worstFirstFrame)} | ${formatRatio(worstP95)} | ${cleanWin ? "yes" : "no"} |`,
    )
  }

  const report = [
    "# Direct VideoToolbox IOSurface batch-size matrix",
    "",
    "The browser baseline is measured once per resolution. Native uses the same direct VideoToolbox → retained CVPixelBuffer → IOSurface → GPUix path while varying only the steady-state retained packet batch. The first packet always remains a one-packet batch.",
    "",
    "## Cross-resolution scorecard",
    "",
    "| Steady batch | Worst decode ratio | Worst presentation ratio | Worst first-frame ratio | Worst presentation-p95 ratio | Clean win at every resolution |",
    "| ---: | ---: | ---: | ---: | ---: | --- |",
    ...scoreRows,
    "",
    "A clean win requires decode and presentation throughput above 1x, plus first-frame and presentation-step p95 below 1x, at 720p, 1080p, and 4K.",
    "",
    "## Resolution detail",
    "",
    "| Resolution | Batch | Native decode | Native / browser | Native presentation | Native / browser | Steady native / browser | First frame native / browser | Native / browser | p95 native / browser | Native / browser |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...detailRows,
    "",
    "This matrix is specifically testing whether the presentation p95 regression is caused by synchronous decode batching. GPUix IOSurface handoff and GPUI flush are unchanged.",
    "",
  ].join("\n")

  await Bun.write(
    join(reportsDirectory, "presentation-direct-iosurface-batch-matrix.md"),
    report + "\n",
  )

  console.log(report)
  console.log("Reports written to examples/mediabunny/reports/presentation-direct-iosurface-batch-*")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
