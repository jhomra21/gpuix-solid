import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { PresentationBenchmarkReport } from "./presentation-report.ts"

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const buildDirectory = join(projectDirectory, ".browser-presentation-external")
const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const codec = process.env.MEDIABUNNY_PRESENTATION_CODEC === "avc" ? "avc" : "vp8"

await rm(buildDirectory, { recursive: true, force: true })
await mkdir(buildDirectory, { recursive: true })

const build = await Bun.build({
  entrypoints: [join(sourceDirectory, "presentation-browser-entry.ts")],
  outdir: buildDirectory,
  target: "browser",
  naming: "browser.js",
})

if (!build.success) {
  throw new Error(
    "Presentation browser bundle failed:\n"
      + build.logs.map((log) => String(log)).join("\n"),
  )
}

let resolveReport: ((report: PresentationBenchmarkReport) => void) | undefined
let rejectReport: ((error: Error) => void) | undefined
const reportPromise = new Promise<PresentationBenchmarkReport>((resolve, reject) => {
  resolveReport = resolve
  rejectReport = reject
})

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === "/browser.js") {
      return new Response(Bun.file(join(buildDirectory, "browser.js")), {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      })
    }

    if (url.pathname === "/fixture.webm") {
      return new Response(Bun.file(fixturePath), {
        headers: { "content-type": codec === "avc" ? "video/mp4" : "video/webm" },
      })
    }

    if (url.pathname === "/report" && request.method === "POST") {
      try {
        const raw = await request.json()
        // SAFETY: the browser entry in this repository emits PresentationBenchmarkReport JSON; the checks below reject mismatched output.
        const report = raw as PresentationBenchmarkReport
        if (
          report.schemaVersion !== 2
          || report.backend !== "browser-webcodecs-canvas"
          || report.workload.codec !== codec
        ) {
          throw new Error("Browser benchmark submitted an unsupported report")
        }
        resolveReport?.(report)
        return new Response("ok")
      } catch (error) {
        const parsed = error instanceof Error ? error : new Error(String(error))
        rejectReport?.(parsed)
        return new Response(parsed.message, { status: 400 })
      }
    }

    if (url.pathname !== "/") {
      return new Response("not found", { status: 404 })
    }

    return new Response(
      `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>MediaBunny presentation benchmark</title></head>
  <body data-status="running">
    <pre id="report">Running browser WebCodecs benchmark…</pre>
    <script type="module" src="/browser.js"></script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )
  },
})

const url = new URL(`http://127.0.0.1:${server.port}/`)
url.searchParams.set("iterations", String(iterations))
url.searchParams.set("warmups", String(warmups))
url.searchParams.set("codec", codec)
url.searchParams.set("reportEndpoint", "/report")

process.stderr.write(
  `Open this URL in Codex's in-app browser to run the browser half of the benchmark:\n${url.href}\n`,
)

try {
  const report = await reportPromise
  process.stdout.write(JSON.stringify(report))
} finally {
  server.stop(true)
  await rm(buildDirectory, { recursive: true, force: true })
}
