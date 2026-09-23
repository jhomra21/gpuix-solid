import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { DirectDecodeReport } from "./direct-decode-report.ts"

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const buildDirectory = join(projectDirectory, ".direct-decode-browser")
const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 5)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 2)
const codec = process.env.MEDIABUNNY_PRESENTATION_CODEC === "hevc" ? "hevc" : "avc"

await rm(buildDirectory, { recursive: true, force: true })
await mkdir(buildDirectory, { recursive: true })

const build = await Bun.build({
  entrypoints: [join(sourceDirectory, "direct-decode-browser-entry.ts")],
  outdir: buildDirectory,
  target: "browser",
  naming: "browser.js",
})

if (!build.success) {
  throw new Error(
    "Direct decode browser bundle failed:\n"
      + build.logs.map((log) => String(log)).join("\n"),
  )
}

let resolveReport: ((report: DirectDecodeReport) => void) | undefined
let rejectReport: ((error: Error) => void) | undefined
const reportPromise = new Promise<DirectDecodeReport>((resolve, reject) => {
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

    if (url.pathname === "/fixture.mp4") {
      return new Response(Bun.file(fixturePath), {
        headers: { "content-type": "video/mp4" },
      })
    }

    if (url.pathname === "/report" && request.method === "POST") {
      try {
        const raw = await request.json()
        // SAFETY: this endpoint only accepts the repository's direct browser benchmark report; the checks below reject mismatched output.
        const report = raw as DirectDecodeReport
        if (
          report.schemaVersion !== 1
          || report.backend !== "browser-webcodecs-direct"
          || report.workload.codec !== codec
        ) {
          throw new Error("Browser submitted an unsupported direct decode report")
        }

        setTimeout(() => resolveReport?.(report), 50)
        return new Response("ok")
      } catch (error) {
        const parsed = error instanceof Error ? error : new Error(String(error))
        setTimeout(() => rejectReport?.(parsed), 50)
        return new Response(parsed.message, { status: 400 })
      }
    }

    if (url.pathname !== "/") {
      return new Response("not found", { status: 404 })
    }

    return new Response(
      `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Direct WebCodecs decode benchmark</title></head>
  <body data-status="running">
    <pre id="report">Running direct browser WebCodecs benchmark…</pre>
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
  `Open this URL in Codex's in-app browser to run direct browser WebCodecs decode:\n${url.href}\n`,
)

try {
  const report = await reportPromise
  process.stdout.write(JSON.stringify(report))
  await Bun.sleep(75)
} finally {
  server.stop(true)
  await rm(buildDirectory, { recursive: true, force: true })
}
