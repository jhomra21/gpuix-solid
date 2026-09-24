import { spawn } from "node:child_process"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../../../packages/solid/dist/automation/stdio.js"

const here = dirname(fileURLToPath(import.meta.url))
const exampleDirectory = join(here, "..")
const screenshotPath = "/tmp/gpuix-solid1-diffusion-live-automation.png"
const timeoutMs = 20_000

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function processError(exit, stderrChunks) {
  const stderr = stderrChunks.join("").trim()
  return new Error(
    `Diffusion live automation exited early (code=${String(exit.code)}, signal=${String(exit.signal)})${stderr ? `\n${stderr}` : ""}`,
  )
}

function descendants(node) {
  const values = [node]
  for (const child of node.children ?? []) values.push(...descendants(child))
  return values
}

function findByTestId(node, testId) {
  if (!node) return null
  return descendants(node).find((candidate) => candidate.testId === testId) ?? null
}

function svgSource(node) {
  const svg = descendants(node).find((candidate) => candidate.type === "svg")
  const source = svg?.customProps?.source
  return typeof source === "string" ? source : null
}

function drawListText(node) {
  return JSON.stringify(node.customProps?.drawList ?? null)
}

async function waitFor(label, operation) {
  const started = Date.now()
  let lastValue
  for (;;) {
    lastValue = await operation()
    if (lastValue) return lastValue
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`)
    }
    await delay(25)
  }
}

if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

const stderrChunks = []
const child = spawn("bun", ["dist/app/index.js"], {
  cwd: exampleDirectory,
  env: {
    ...process.env,
    GPUIX_BACKGROUND: "1",
  },
  stdio: ["pipe", "pipe", "pipe"],
})

child.stderr.on("data", (chunk) => {
  stderrChunks.push(chunk.toString("utf8"))
})

const exited = new Promise((resolve) => {
  child.once("exit", (code, signal) => resolve({ code, signal }))
})

let app
try {
  app = await Promise.race([
    connectStdio({
      write(chunk) {
        child.stdin.write(chunk)
      },
      feed(listener) {
        child.stdout.on("data", (buffer) => listener(buffer.toString("utf8")))
      },
      async close() {
        if (!child.killed) child.kill()
      },
    }),
    exited.then((result) => {
      throw processError(result, stderrChunks)
    }),
  ])

  await app.getByTestId("diffusion-source-editor").waitFor({ timeoutMs })
  const rectangle = app.getByTestId("diffusion-toolbar-rectangle")
  await rectangle.waitFor({ timeoutMs })

  const beforeTree = await app.backend.getTree()
  const beforeButton = findByTestId(beforeTree, "diffusion-toolbar-rectangle")
  if (!beforeButton) throw new Error("Rectangle button disappeared before live click")

  const beforeSvg = svgSource(beforeButton)
  if (!beforeSvg || beforeSvg.includes("currentColor")) {
    throw new Error("Rectangle button SVG should enter live automation with resolved currentColor")
  }

  await rectangle.click()

  const selectedSvg = await waitFor("Rectangle selected paint", async () => {
    const tree = await app.backend.getTree()
    const button = findByTestId(tree, "diffusion-toolbar-rectangle")
    if (!button) return null
    const source = svgSource(button)
    return source && source !== beforeSvg && !source.includes("currentColor") ? source : null
  })

  const stage = await waitFor("Diffusion EngineCanvas draw list", async () => {
    const tree = await app.backend.getTree()
    if (!tree) return null
    return descendants(tree).find(
      (node) => node.type === "canvas" && drawListText(node).includes("#22C55E"),
    ) ?? null
  })

  const stageBounds = stage.bounds ?? await app.backend.getBounds(stage.id)
  if (!stageBounds || stageBounds.width < 240 || stageBounds.height < 180) {
    throw new Error(`Unexpected Diffusion EngineCanvas bounds: ${JSON.stringify(stageBounds)}`)
  }

  const start = {
    x: stageBounds.x + stageBounds.width * 0.35,
    y: stageBounds.y + stageBounds.height * 0.35,
  }
  const end = {
    x: Math.min(stageBounds.x + stageBounds.width - 24, start.x + 120),
    y: Math.min(stageBounds.y + stageBounds.height - 24, start.y + 80),
  }

  await app.mouse.drag(start, end, { steps: 8 })

  const insertedDrawList = await waitFor("DrawOverlay rectangle insert", async () => {
    const tree = await app.backend.getTree()
    if (!tree) return null
    const canvas = descendants(tree).find((node) => node.id === stage.id)
    const drawList = canvas ? drawListText(canvas) : ""
    return drawList.includes("#E0E0E0") ? drawList : null
  })

  await app.screenshot({ path: screenshotPath })
  if (!existsSync(screenshotPath) || statSync(screenshotPath).size <= 10_000) {
    throw new Error("Diffusion live automation screenshot should contain a rendered frame")
  }

  console.log("solid1 Diffusion live automation:", JSON.stringify({
    rectangleSvgChanged: selectedSvg !== beforeSvg,
    stageBounds,
    drag: { start, end },
    insertedDrawListBytes: insertedDrawList.length,
    screenshotPath,
  }))
  console.log("solid1 Diffusion live automation: passed")
} catch (error) {
  const stderr = stderrChunks.join("").trim()
  if (stderr && error instanceof Error && !error.message.includes(stderr)) {
    error.message += `\n${stderr}`
  }
  throw error
} finally {
  if (app) await app.close().catch(() => {})
  if (!child.killed) child.kill()
  await Promise.race([exited, delay(1_000)])
}
