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
  throw new Error("Streaming IOSurface presentation scaling requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const repositoryDirectory = resolve(projectDirectory, "../..")
const reportsDirectory = join(projectDirectory, "reports")
const workDirectory = join(projectDirectory, ".presentation-streaming-iosurface-scaling")
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

function formatRange(values: readonly number[]): string {
  if (values.length === 0) return "n/a"
  return [
    Math.min(...values),
    median(values),
    Math.max(...values),
  ].map((value) => value.toFixed(2)).join(" / ")
}

function formatRunSpread(run: PresentationRun): {
  fps: number
  totalMs: number
  firstFrameMs: number
  p95Ms: number
} {
  return {
    fps: framesPerSecond(run),
    totalMs: run.totalMs,
    firstFrameMs: run.firstFrameMs,
    p95Ms: run.frameStepP95Ms,
  }
}

async function commandOutput(command: string[]): Promise<string> {
  const child = Bun.spawn(command, {
    cwd: repositoryDirectory,
    stdout: "pipe",
    stderr: "ignore",
  })
  const stdout = (await new Response(child.stdout).text()).trim()
  return await child.exited === 0 && stdout ? stdout : "unknown"
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
const spreadRows: string[] = []
const verificationRows: string[] = []
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
      "src/run-presentation-streaming-videotoolbox-native.ts",
      fixturePath,
      env,
    )
    if (native.backend !== "streaming-videotoolbox-iosurface-gpuix-video-frame") {
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

    for (const [backend, measurement, runs] of [
      ["Browser WebCodecs", "Decode only", browser.decodeOnly],
      ["VideoToolbox + GPUix", "Decode only", native.decodeOnly],
      ["Browser WebCodecs", "Presentation", browser.endToEnd],
      ["VideoToolbox + GPUix", "Presentation", native.endToEnd],
    ] as const) {
      const spread = runs.map(formatRunSpread)
      spreadRows.push(
        `| ${resolution.label} | ${backend} | ${measurement} | ${formatRange(spread.map((run) => run.fps))} | ${formatRange(spread.map((run) => run.totalMs))} | ${formatRange(spread.map((run) => run.firstFrameMs))} | ${formatRange(spread.map((run) => run.p95Ms))} |`,
      )
    }

    verificationRows.push(
      `| ${resolution.label} | ${browser.workload.fixtureBytes} | ${String(browser.verification.finalTimestamp ?? "n/a")} | ${String(browser.verification.finalPixel ?? "n/a")} | ${String(native.verification.screenshotBytes ?? "n/a")} |`,
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

  const [commitSha, macOSVersion, cpuBrand] = await Promise.all([
    commandOutput(["git", "rev-parse", "HEAD"]),
    commandOutput(["sw_vers", "-productVersion"]),
    commandOutput(["sysctl", "-n", "machdep.cpu.brand_string"]),
  ])

  let gpuixEdgeSha = "unknown"
  try {
    const edge = await Bun.file(join(repositoryDirectory, ".gpuix", "edge.json")).json() as {
      sha?: string
    }
    gpuixEdgeSha = edge.sha ?? "unknown"
  } catch {
    gpuixEdgeSha = "unknown"
  }

  const report = [
    "# Streaming VideoToolbox IOSurface presentation scaling",
    "",
    "Browser uses MediaBunny CanvasSink with browser WebCodecs. Native includes MediaBunny encoded-packet iteration in its timer, then submits the packet set to a native VideoToolbox worker. Decoded CVPixelBuffers are retained only until a bounded thread-safe callback presents each IOSurface through GPUix/GPUI, allowing decode submission and JS presentation to overlap instead of blocking JS on synchronous packet batches.",
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
    "| Resolution | Streaming decode worker | GPUix IOSurface handoff | GPUI render flush |",
    "| --- | ---: | ---: | ---: |",
    ...stageRows,
    "",
    "Native decode includes MediaBunny packet iteration plus the off-thread VideoToolbox decode worker. IOSurface handoff and GPUI render flush execute synchronously inside each streamed JS frame callback and are measured separately. The stream keeps at most two decoded frames pending before applying native backpressure.",
    "",
    "## Run record",
    "",
    `- Generated: ${new Date().toISOString()}.`,
    `- Candidate: \`${commitSha}\`.`,
    `- GPUIX source edge: \`${gpuixEdgeSha}\`.`,
    `- Host: macOS ${macOSVersion}, ${cpuBrand}, ${process.arch}.`,
    `- Runtime: Node \`${process.version}\`, Bun \`${Bun.version}\`.`,
    `- Workload: AVC, 60 frames per resolution, ${baseEnv.MEDIABUNNY_PRESENTATION_WARMUPS} warmups and ${baseEnv.MEDIABUNNY_PRESENTATION_ITERATIONS} measured iterations per backend and resolution.`,
    "- Native verification requires VideoToolbox hardware acceleration, IOSurface export, monotonic presentation order, a maximum of two pending decoded frames, and no FFmpeg or NodeAV in the decode hot loop.",
    `- Outcome: **${winsEverywhere ? "PASS" : "FAIL"}** — native ${winsEverywhere ? "beats" : "does not beat"} the browser on all four acceptance metrics at all three resolutions.`,
    "",
    "## Verification",
    "",
    "| Resolution | Fixture bytes | Browser final timestamp | Browser final pixel | Native screenshot bytes |",
    "| --- | ---: | ---: | --- | ---: |",
    ...verificationRows,
    "",
    "## Measured-run spread",
    "",
    "Each cell is minimum / median / maximum across the measured iterations. FPS is calculated per run from frame count and elapsed time.",
    "",
    "| Resolution | Backend | Measurement | FPS min / median / max | Total ms min / median / max | First-frame ms min / median / max | Frame-step p95 ms min / median / max |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
    ...spreadRows,
    "",
    "## Reproduction",
    "",
    "From the repository root, with the pinned GPUIX source-edge package prepared and linked:",
    "",
    "```bash",
    "bun install --frozen-lockfile",
    "bun run gpuix:edge:verify",
    "cd examples/mediabunny",
    "bun install --no-save",
    "bun run bench:presentation:iosurface:scaling",
    "```",
    "",
    "Open each printed localhost URL in Codex's in-app browser. The command writes this consolidated Markdown report and removes its temporary fixtures when it exits.",
    "",
  ].join("\n")

  await Bun.write(
    join(reportsDirectory, "presentation-streaming-iosurface-scaling.md"),
    report + "\n",
  )

  console.log(report)
  console.log("Report written to examples/mediabunny/reports/presentation-streaming-iosurface-scaling.md")
} finally {
  await rm(workDirectory, { recursive: true, force: true })
}
