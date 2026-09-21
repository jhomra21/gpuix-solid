import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import type { MediaBunnyBenchmarkReport } from "./suite.ts"

const reportsDirectory = resolve(process.argv[2] ?? "reports")
const files = (await readdir(reportsDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort()

const reports: MediaBunnyBenchmarkReport[] = []
for (const file of files) {
  const raw = await Bun.file(join(reportsDirectory, file)).json()
  // SAFETY: benchmark reports are produced by this repository's suite; schemaVersion is checked immediately below before any fields are consumed.
  const parsed = raw as MediaBunnyBenchmarkReport
  if (parsed.schemaVersion !== 1) throw new Error(`Unsupported report schema in ${file}`)
  reports.push(parsed)
}

if (reports.length === 0) throw new Error(`No MediaBunny JSON reports found in ${reportsDirectory}`)

const backendOrder = ["browser-webcodecs", "mediabunny-server", "napi-webcodecs"] as const
reports.sort((a, b) => backendOrder.indexOf(a.backend) - backendOrder.indexOf(b.backend))

function supportCell(encode: boolean, decode: boolean): string {
  if (encode && decode) return "encode + decode"
  if (encode) return "encode"
  if (decode) return "decode"
  return "—"
}

function numberCell(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(2)
}

const lines = [
  "# MediaBunny backend comparison",
  "",
  "Generated from one shared workload. Hosted-runner timings are diagnostic, not stable performance claims.",
  "",
  "## Video codec capability",
  "",
  `| Codec | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---").join(" | ")} |`,
]

const videoCodecs = reports[0]?.capabilities.video.map((entry) => entry.codec) ?? []
for (const codec of videoCodecs) {
  lines.push(
    `| ${codec} | ${reports.map((report) => {
      const entry = report.capabilities.video.find((candidate) => candidate.codec === codec)
      return entry ? supportCell(entry.encode, entry.decode) : "—"
    }).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## Audio codec capability",
  "",
  `| Codec | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---").join(" | ")} |`,
)

const audioCodecs = reports[0]?.capabilities.audio.map((entry) => entry.codec) ?? []
for (const codec of audioCodecs) {
  lines.push(
    `| ${codec} | ${reports.map((report) => {
      const entry = report.capabilities.audio.find((candidate) => candidate.codec === codec)
      return entry ? supportCell(entry.encode, entry.decode) : "—"
    }).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## MediaBunny feature cases",
  "",
  `| Feature | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---").join(" | ")} |`,
)

const featureNames = reports[0]?.features.map((entry) => entry.name) ?? []
for (const name of featureNames) {
  lines.push(
    `| ${name} | ${reports.map((report) => {
      const feature = report.features.find((entry) => entry.name === name)
      if (!feature) return "—"
      if (feature.status === "pass") return `pass (${feature.milliseconds.toFixed(2)} ms)`
      if (feature.status === "unsupported") return "unsupported"
      return `error: ${feature.error ?? "unknown"}`
    }).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## Shared VP8 + Opus WebM workload",
  "",
  `| Measurement (ms) | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---:").join(" | ")} |`,
)

const measurementNames = reports[0]?.measurements.map((entry) => entry.name) ?? []
for (const name of measurementNames) {
  lines.push(
    `| ${name} | ${reports.map((report) =>
      numberCell(report.measurements.find((entry) => entry.name === name)?.milliseconds)
    ).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## Round-trip correctness",
  "",
  `| Field | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---:").join(" | ")} |`,
)

for (const [label, key] of [
  ["output bytes", "bytes"],
  ["duration seconds", "durationSeconds"],
  ["video packets", "videoPackets"],
  ["audio packets", "audioPackets"],
  ["decoded video samples", "decodedVideoSamples"],
  ["decoded audio frames", "decodedAudioFrames"],
  ["coded width", "codedWidth"],
  ["coded height", "codedHeight"],
  ["seek timestamp", "seekTimestamp"],
] as const) {
  lines.push(`| ${label} | ${reports.map((report) => String(report.roundTrip[key])).join(" | ")} |`)
}

console.log(lines.join("\n"))
