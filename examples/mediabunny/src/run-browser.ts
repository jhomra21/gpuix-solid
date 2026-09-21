import { mkdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const buildDirectory = join(projectDirectory, ".browser-benchmark")

await rm(buildDirectory, { recursive: true, force: true })
await mkdir(buildDirectory, { recursive: true })

const build = await Bun.build({
  entrypoints: [join(sourceDirectory, "browser-entry.ts")],
  outdir: buildDirectory,
  target: "browser",
  naming: "browser.js",
})

if (!build.success) {
  throw new Error(
    "Browser benchmark bundle failed:\n"
      + build.logs.map((log) => String(log)).join("\n"),
  )
}

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

    return new Response(
      `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>MediaBunny browser benchmark</title></head>
  <body data-status="running">
    <pre id="report"></pre>
    <script type="module" src="/browser.js"></script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )
  },
})

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.port}/`)
  await page.waitForFunction(() => {
    const status = document.body.dataset.status
    return status === "ready" || status === "error"
  })

  const status = await page.getAttribute("body", "data-status")
  const output = await page.textContent("#report")
  if (!output) throw new Error("Browser benchmark returned an empty report")
  if (status === "error") throw new Error(`Browser benchmark failed:\n${output}`)

  const report: unknown = JSON.parse(output)
  console.log(JSON.stringify(report, null, 2))
if (report.summary.errors > 0) process.exitCode = 1
} finally {
  await browser.close()
  server.stop(true)
  await rm(buildDirectory, { recursive: true, force: true })
}
