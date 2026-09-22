import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import type { PresentationBenchmarkReport } from "./presentation-report.ts"

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const buildDirectory = join(projectDirectory, ".browser-presentation-benchmark")
const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const headless = process.env.MEDIABUNNY_PRESENTATION_HEADLESS !== "0"
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

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === "/browser.js") {
      return new Response(Bun.file(join(buildDirectory, "browser.js")), {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      })
    }
    if (url.pathname === "/fixture.webm") {
      return new Response(Bun.file(fixturePath), {
        headers: { "content-type": "video/webm" },
      })
    }
    return new Response(
      `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>MediaBunny presentation benchmark</title></head>
  <body data-status="running">
    <pre id="report"></pre>
    <script type="module" src="/browser.js"></script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )
  },
})

const browser = await chromium.launch({ headless })
try {
  const page = await browser.newPage()
  await page.goto(
    `http://127.0.0.1:${server.port}/?iterations=${iterations}&warmups=${warmups}&codec=${codec}`,
  )
  await page.waitForFunction(() => {
    const status = document.body.dataset.status
    return status === "ready" || status === "error"
  }, undefined, { timeout: 120_000 })

  const status = await page.getAttribute("body", "data-status")
  const output = await page.textContent("#report")
  if (!output) throw new Error("Presentation browser benchmark returned an empty report")
  if (status === "error") throw new Error(`Presentation browser benchmark failed:\n${output}`)

  const raw = JSON.parse(output)
  // SAFETY: the browser entry in this repository emits this schema, and the version/backend checks below reject mismatched output.
  const report = raw as PresentationBenchmarkReport
  if (report.schemaVersion !== 2 || report.backend !== "browser-webcodecs-canvas") {
    throw new Error("Presentation browser benchmark returned an unsupported report")
  }
  console.log(JSON.stringify(report))
} finally {
  await browser.close()
  server.stop(true)
  await rm(buildDirectory, { recursive: true, force: true })
}
