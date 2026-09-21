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
  if (parsed.schemaVersion !== 2) throw new Error(`Unsupported report schema in ${file}`)
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
  "## Video codec round trips",
  "",
  `| Codec | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---").join(" | ")} |`,
)

const roundTripVideoCodecs = reports[0]?.codecRoundTrips.video.map((entry) => entry.codec) ?? []
for (const codec of roundTripVideoCodecs) {
  lines.push(
    `| ${codec} | ${reports.map((report) => {
      const result = report.codecRoundTrips.video.find((entry) => entry.codec === codec)
      if (!result) return "—"
      if (result.status === "unsupported") return "unsupported"
      if (result.status === "timeout") return `timeout: ${result.note ?? "bounded probe exceeded its budget"}`
      if (result.status === "known-gap") {
        const evidence = [
          result.encoderConfigCodec ? `codec=${result.encoderConfigCodec}` : null,
          result.muxPreservedPackets === undefined ? null : `mux-preserved=${result.muxPreservedPackets}`,
        ].filter((value) => value !== null).join(", ")
        return `known gap: ${result.note ?? result.error ?? "documented backend incompatibility"}${evidence ? ` (${evidence}` : ""}${evidence ? ")" : ""}`
      }
      if (result.status === "error") {
        const evidence = [
          result.encoderConfigCodec ? `codec=${result.encoderConfigCodec}` : null,
          result.muxPreservedPackets === undefined ? null : `mux-preserved=${result.muxPreservedPackets}`,
        ].filter((value) => value !== null).join(", ")
        return `error: ${result.error ?? "unknown"}${evidence ? ` (${evidence})` : ""}`
      }
      const evidence = [
        result.encoderConfigCodec ? `codec=${result.encoderConfigCodec}` : null,
        result.muxPreservedPackets === undefined ? null : `mux-preserved=${result.muxPreservedPackets}`,
      ].filter((value) => value !== null).join(", ")
      return `pass (enc ${numberCell(result.encodeMs)} / dec ${numberCell(result.decodeMs)} ms${evidence ? ` / ${evidence}` : ""})`
    }).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## Audio codec round trips",
  "",
  `| Codec | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---").join(" | ")} |`,
)

const roundTripAudioCodecs = reports[0]?.codecRoundTrips.audio.map((entry) => entry.codec) ?? []
for (const codec of roundTripAudioCodecs) {
  lines.push(
    `| ${codec} | ${reports.map((report) => {
      const result = report.codecRoundTrips.audio.find((entry) => entry.codec === codec)
      if (!result) return "—"
      if (result.status === "unsupported") return "unsupported"
      if (result.status === "timeout") return `timeout: ${result.note ?? "bounded probe exceeded its budget"}`
      if (result.status === "known-gap") return `known gap: ${result.note ?? result.error ?? "documented backend incompatibility"}`
      if (result.status === "error") return `error: ${result.error ?? "unknown"}`
      const container = result.container ? ` / ${result.container}` : ""
      return `pass (enc ${numberCell(result.encodeMs)} / dec ${numberCell(result.decodeMs)} ms${container})`
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
      if (feature.status === "known-gap") return `known gap: ${feature.note ?? feature.error ?? "documented backend incompatibility"}`
      return `error: ${feature.error ?? "unknown"}`
    }).join(" | ")} |`,
  )
}

lines.push(
  "",
  "## Result summary",
  "",
  `| Status | ${reports.map((report) => report.backend).join(" | ")} |`,
  `| --- | ${reports.map(() => "---:").join(" | ")} |`,
  `| pass | ${reports.map((report) => report.summary.passes).join(" | ")} |`,
  `| unsupported | ${reports.map((report) => report.summary.unsupported).join(" | ")} |`,
  `| known gaps | ${reports.map((report) => report.summary.knownGaps).join(" | ")} |`,
  `| bounded timeouts | ${reports.map((report) => report.summary.timeouts).join(" | ")} |`,
  `| unexpected errors | ${reports.map((report) => report.summary.errors).join(" | ")} |`,
)

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
