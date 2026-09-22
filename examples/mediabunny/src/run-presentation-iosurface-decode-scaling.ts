import { mkdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { iosurfaceDecodeVariants } from "./iosurface-decode-variants.ts"
import {
  framesPerSecond,
  median,
  type PresentationBenchmarkReport,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Native decode scaling matrix requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")

const resolutions = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
] as const

type ResolutionResult = {
  label: string
  key: string
  browser: PresentationBenchmarkReport
  variants: Map<string, PresentationBenchmarkReport>
}

function decodeFps(report: PresentationBenchmarkReport): number {
  return median(report.decodeOnly.map(framesPerSecond))
}

function presentationFps(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map(framesPerSecond))
}

function firstFrameMs(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.firstFrameMs))
}

function p95Ms(report: PresentationBenchmarkReport): number {
  return median(report.endToEnd.map((run) => run.frameStepP95Ms))
}

function divide(value: number, baseline: number): number {
  return baseline <= 0 ? Number.NaN : value / baseline
}

function formatRatio(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "n/a"
}

async function readReport(path: string): Promise<PresentationBenchmarkReport> {
  // SAFETY: these files are written by the repository matrix runner immediately before reading.
  const report = await Bun.file(path).json() as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.workload.codec !== "avc") {
    throw new Error(`Unsupported decode matrix report: ${path}`)
  }
  return report
}

await mkdir(reportsDirectory, { recursive: true })

const results: ResolutionResult[] = []
const resolutionSections: string[] = []

for (const resolution of resolutions) {
  const child = Bun.spawn(
    [process.execPath, "src/run-presentation-iosurface-decode-matrix.ts"],
    {
      cwd: projectDirectory,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        MEDIABUNNY_PRESENTATION_WIDTH: String(resolution.width),
        MEDIABUNNY_PRESENTATION_HEIGHT: String(resolution.height),
      },
    },
  )
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`${resolution.label} decode matrix exited with code ${exitCode}`)
  }

  const key = `${resolution.width}x${resolution.height}`
  const matrixPath = join(
    reportsDirectory,
    `presentation-iosurface-decode-${key}-matrix.md`,
  )
  const matrix = await Bun.file(matrixPath).text()
  const matrixBody = matrix.replace(/^# Native decode experiment matrix\n+/, "")

  const browser = await readReport(
    join(reportsDirectory, `presentation-iosurface-decode-${key}-browser.json`),
  )
  const variants = new Map<string, PresentationBenchmarkReport>()
  for (const variant of iosurfaceDecodeVariants) {
    variants.set(
      variant.key,
      await readReport(
        join(
          reportsDirectory,
          `presentation-iosurface-decode-${key}-${variant.key}.json`,
        ),
      ),
    )
  }

  results.push({ label: resolution.label, key, browser, variants })
  resolutionSections.push(
    `## ${resolution.label} (${key})`,
    "",
    matrixBody.trim(),
    "",
  )
}

const scorecard = [
  "## Cross-resolution scorecard",
  "",
  "Throughput columns show the worst native/browser ratio across 720p, 1080p, and 4K, so values above 1 mean the variant beat the browser at every resolution. Latency columns show the worst native/browser ratio, so values below 1 mean it beat the browser at every resolution.",
  "",
  "| Variant | Worst decode | Worst presentation | Worst first frame | Worst p95 | Beats browser everywhere |",
  "| --- | ---: | ---: | ---: | ---: | :---: |",
]

for (const variant of iosurfaceDecodeVariants) {
  const decodeRatios: number[] = []
  const presentationRatios: number[] = []
  const firstFrameRatios: number[] = []
  const p95Ratios: number[] = []

  for (const result of results) {
    const native = result.variants.get(variant.key)
    if (!native) throw new Error(`Missing ${variant.key} report for ${result.key}`)

    decodeRatios.push(divide(decodeFps(native), decodeFps(result.browser)))
    presentationRatios.push(divide(presentationFps(native), presentationFps(result.browser)))
    firstFrameRatios.push(divide(firstFrameMs(native), firstFrameMs(result.browser)))
    p95Ratios.push(divide(p95Ms(native), p95Ms(result.browser)))
  }

  const worstDecode = Math.min(...decodeRatios)
  const worstPresentation = Math.min(...presentationRatios)
  const worstFirstFrame = Math.max(...firstFrameRatios)
  const worstP95 = Math.max(...p95Ratios)
  const beatsEverywhere =
    worstDecode > 1
    && worstPresentation > 1
    && worstFirstFrame < 1
    && worstP95 < 1

  scorecard.push(
    `| ${variant.label} | ${formatRatio(worstDecode)} | ${formatRatio(worstPresentation)} | ${formatRatio(worstFirstFrame)} | ${formatRatio(worstP95)} | ${beatsEverywhere ? "yes" : "no"} |`,
  )
}

const combined = [
  "# Native decode scaling matrix",
  "",
  "Each resolution uses the same AVC workload and decoder variants.",
  "",
  ...scorecard,
  "",
  ...resolutionSections,
].join("\n")

await Bun.write(
  join(reportsDirectory, "presentation-iosurface-decode-scaling.md"),
  combined + "\n",
)

console.log("")
console.log(scorecard.join("\n"))
console.log("")
console.log("Combined report written to examples/mediabunny/reports/presentation-iosurface-decode-scaling.md")
