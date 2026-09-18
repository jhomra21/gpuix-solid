import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../packages/solid/dist/automation/stdio.js"

const counterDirectory = fileURLToPath(new URL("../examples/counter/", import.meta.url))
const timeoutMs = 15_000
const settleMs = 25
const expectedStatus = 'Internal drop: {"kind":"demo-card","id":1}'
const fatalNativePattern = /cannot update .*GpuixView|already being updated|fatal runtime error|failed to initiate panic|SIGABRT|thread .* panicked/i

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function processError(exit, stderrChunks) {
  const stderr = stderrChunks.join("").trim()
  return new Error(
    `Desktop live acceptance exited before automation completed (code=${String(exit.code)}, signal=${String(exit.signal)})${stderr ? `\n${stderr}` : ""}`,
  )
}

const stderrChunks = []
const child = spawn("bun", ["dist/desktop-integrations/desktop-integrations.js"], {
  cwd: counterDirectory,
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

async function step(label, operation) {
  let timer
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Desktop live acceptance: ${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    )
    timer.unref()
  })
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      exited.then((result) => {
        throw processError(result, stderrChunks)
      }),
      timedOut,
    ])
  } finally {
    clearTimeout(timer)
  }
}

let app
try {
  app = await step("automation initialization", () =>
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
  )

  const source = app.getByTestId("desktop-drag-source")
  const target = app.getByTestId("desktop-internal-drop-target")
  const status = app.getByTestId("desktop-status")

  await step("wait for drag source", () => source.waitFor({ timeoutMs: 5_000 }))
  await step("wait for drop target", () => target.waitFor({ timeoutMs: 5_000 }))

  const start = await step("read drag source center", () => source.center())
  const end = await step("read drop target center", () => target.center())
  const previewPoint = {
    x: start.x + (end.x - start.x) * 0.45,
    y: start.y + (end.y - start.y) * 0.45,
  }

  await step("move to drag source", () => app.mouse.move(start))
  await step("press drag source", () => app.mouse.down(start))
  await step("move semantic drag", () => app.mouse.move(previewPoint, { pressedButton: 0 }))

  const preview = app.getByTestId("gpuix-drag-preview")
  await step("observe drag preview", async () => {
    await preview.waitFor({ timeoutMs: 5_000 })
    const label = (await preview.textContent()).trim()
    if (label !== "Drag this card") {
      throw new Error(`Desktop live acceptance expected drag preview label "Drag this card", got ${JSON.stringify(label)}`)
    }
    const bounds = await preview.bounds()
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error(`Desktop live acceptance drag preview did not paint non-zero bounds: ${JSON.stringify(bounds)}`)
    }
    const deltaX = bounds.x - previewPoint.x
    const deltaY = bounds.y - previewPoint.y
    if (deltaX < 0 || deltaY < 0 || deltaX > 64 || deltaY > 64) {
      throw new Error(
        `Desktop live acceptance drag preview did not paint near the pointer: ${JSON.stringify({ bounds, previewPoint, deltaX, deltaY })}`,
      )
    }
  })

  await step("move over drop target", () => app.mouse.move(end, { pressedButton: 0 }))
  await step("release over drop target", () => app.mouse.up(end))

  await step("remove drag preview after release", async () => {
    const deadline = Date.now() + 5_000
    for (;;) {
      if (await preview.count() === 0) return
      if (Date.now() >= deadline) {
        throw new Error("Desktop live acceptance drag preview remained mounted after release")
      }
      await delay(settleMs)
    }
  })

  await step("observe semantic drop", async () => {
    const deadline = Date.now() + 5_000
    for (;;) {
      const actual = (await status.textContent()).trim()
      if (actual === expectedStatus) return
      if (Date.now() >= deadline) {
        throw new Error(
          `Desktop live acceptance expected status ${JSON.stringify(expectedStatus)}, got ${JSON.stringify(actual)}`,
        )
      }
      await delay(settleMs)
    }
  })

  const stderr = stderrChunks.join("")
  if (fatalNativePattern.test(stderr)) {
    throw new Error(`Desktop live acceptance saw fatal native output:\n${stderr.trim()}`)
  }

  console.log("Desktop live-native semantic drag/drop acceptance passed.")
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
