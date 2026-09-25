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

async function nodeBounds(app, node) {
  return node.bounds ?? await app.backend.getBounds(node.id)
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

  const editor = app.getByTestId("diffusion-source-editor")
  await editor.waitFor({ timeoutMs })
  const rectangle = app.getByTestId("diffusion-toolbar-rectangle")
  await rectangle.waitFor({ timeoutMs })

  const stage = await waitFor("Diffusion EngineCanvas", async () => {
    const tree = await app.backend.getTree()
    if (!tree) return null

    const editorNode = descendants(tree).find((node) => node.testId === "diffusion-source-editor")
    if (!editorNode) return null

    const candidates = []
    for (const node of descendants(editorNode)) {
      if (node.type !== "canvas") continue
      const bounds = await nodeBounds(app, node)
      if (!bounds || bounds.width < 240 || bounds.height < 180) continue
      candidates.push({ node, bounds, area: bounds.width * bounds.height })
    }

    candidates.sort((left, right) => right.area - left.area)
    return candidates[0] ?? null
  })

  const stageBounds = stage.bounds
  if (!stageBounds || stageBounds.width < 240 || stageBounds.height < 180) {
    throw new Error(`Unexpected Diffusion EngineCanvas bounds: ${JSON.stringify(stageBounds)}`)
  }

  await rectangle.click()

  const overlay = await waitFor("Rectangle DrawOverlay", async () => {
    const tree = await app.backend.getTree()
    if (!tree) return null
    const node = descendants(tree).find(
      (candidate) => candidate.style?.cursor === "crosshair" && candidate.style?.pointerEvents !== "none",
    )
    if (!node) return null
    const bounds = await nodeBounds(app, node)
    return bounds ? { node, bounds } : null
  })

  const overlayBounds = overlay.bounds
  if (overlayBounds.width < 240 || overlayBounds.height < 180) {
    throw new Error(`Unexpected Diffusion DrawOverlay bounds: ${JSON.stringify(overlayBounds)}`)
  }

  const start = {
    x: overlayBounds.x + overlayBounds.width * 0.35,
    y: overlayBounds.y + overlayBounds.height * 0.35,
  }
  const end = {
    x: Math.min(overlayBounds.x + overlayBounds.width - 24, start.x + 120),
    y: Math.min(overlayBounds.y + overlayBounds.height - 24, start.y + 80),
  }

  await app.mouse.drag(start, end, { steps: 8 })

  const insertedLayer = await waitFor("DrawOverlay rectangle insert", async () => {
    const matches = await app.getByText("Rect 1").all()
    return matches[0] ?? null
  })

  await app.screenshot({ path: screenshotPath })
  if (!existsSync(screenshotPath) || statSync(screenshotPath).size <= 10_000) {
    throw new Error("Diffusion live automation screenshot should contain a rendered frame")
  }

  console.log("solid1 Diffusion live automation:", JSON.stringify({
    stageBounds,
    overlayBounds,
    drag: { start, end },
    insertedLayer: {
      id: insertedLayer.id,
      type: insertedLayer.type,
      text: insertedLayer.text ?? null,
    },
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
