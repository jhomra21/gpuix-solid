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

  const sourceBounds = await step("read drag source bounds", () => source.bounds())
  const targetBounds = await step("read drop target bounds", () => target.bounds())
  const grabOffset = {
    x: sourceBounds.width * 0.25,
    y: sourceBounds.height / 2,
  }
  const start = {
    x: sourceBounds.x + grabOffset.x,
    y: sourceBounds.y + grabOffset.y,
  }
  const end = {
    x: targetBounds.x + targetBounds.width * 0.65,
    y: targetBounds.y + targetBounds.height / 2,
  }
  const previewPoint = {
    x: start.x + (end.x - start.x) * 0.45,
    y: start.y + (end.y - start.y) * 0.45,
  }
  const invalid = {
    x: targetBounds.x + targetBounds.width / 2,
    y: targetBounds.y + targetBounds.height + 60,
  }
  const preview = app.getByTestId("gpuix-drag-preview")

  await step("move to source for rejected drag", () => app.mouse.move(start))
  await step("press source for rejected drag", () => app.mouse.down(start))
  await step("move rejected drag outside target", () => app.mouse.move(invalid, { pressedButton: 0 }))
  await step("observe rejected drag preview", () => preview.waitFor({ timeoutMs: 5_000 }))
  const rejectedReleaseBounds = await step("read rejected release bounds", () => preview.bounds())
  await step("release rejected drag", () => app.mouse.up(invalid))

  await step("keep rejected preview mounted for return", async () => {
    if (await preview.count() !== 1) {
      throw new Error("Desktop live acceptance rejected drag preview disappeared before return animation")
    }
  })

  await delay(60)
  await step("observe rejected preview moving home", async () => {
    const returningBounds = await preview.bounds()
    const releaseDistance = Math.hypot(
      rejectedReleaseBounds.x - sourceBounds.x,
      rejectedReleaseBounds.y - sourceBounds.y,
    )
    const returningDistance = Math.hypot(
      returningBounds.x - sourceBounds.x,
      returningBounds.y - sourceBounds.y,
    )
    if (!(returningDistance < releaseDistance)) {
      throw new Error(
        `Desktop live acceptance rejected drag preview did not move toward its source: ${JSON.stringify({ rejectedReleaseBounds, returningBounds, sourceBounds })}`,
      )
    }
  })

  await step("remove rejected preview after return", async () => {
    const deadline = Date.now() + 1_000
    for (;;) {
      if (await preview.count() === 0) return
      if (Date.now() >= deadline) {
        throw new Error("Desktop live acceptance rejected drag preview remained mounted after return animation")
      }
      await delay(settleMs)
    }
  })

  await step("preserve source after rejected drop", async () => {
    const after = await source.bounds()
    const positionError = {
      x: Math.abs(after.x - sourceBounds.x),
      y: Math.abs(after.y - sourceBounds.y),
    }
    if (positionError.x > 1 || positionError.y > 1) {
      throw new Error(
        `Desktop live acceptance rejected drop moved the committed source: ${JSON.stringify({ sourceBounds, after, positionError })}`,
      )
    }
  })

  await step("move to drag source", () => app.mouse.move(start))
  await step("press drag source", () => app.mouse.down(start))
  await step("move semantic drag", () => app.mouse.move(previewPoint, { pressedButton: 0 }))

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
    const sizeError = {
      width: Math.abs(bounds.width - sourceBounds.width),
      height: Math.abs(bounds.height - sourceBounds.height),
    }
    if (sizeError.width > 4 || sizeError.height > 4) {
      throw new Error(
        `Desktop live acceptance drag preview must match the source element size: ${JSON.stringify({ sourceBounds, bounds, sizeError })}`,
      )
    }
    const expectedPreview = {
      x: previewPoint.x - grabOffset.x,
      y: previewPoint.y - grabOffset.y,
    }
    const hotspotError = {
      x: Math.abs(bounds.x - expectedPreview.x),
      y: Math.abs(bounds.y - expectedPreview.y),
    }
    if (hotspotError.x > 4 || hotspotError.y > 4) {
      throw new Error(
        `Desktop live acceptance drag preview did not preserve the source grab point: ${JSON.stringify({ bounds, expectedPreview, hotspotError })}`,
      )
    }
  })

  await step("capture drag preview screenshot", () =>
    app.screenshot({ path: "/tmp/gpuix-solid-desktop-drag-preview.png" }),
  )

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

  await step("observe committed card position", async () => {
    const committedBounds = await source.bounds()
    const expectedCommitted = {
      x: end.x - grabOffset.x,
      y: end.y - grabOffset.y,
    }
    const sizeError = {
      width: Math.abs(committedBounds.width - sourceBounds.width),
      height: Math.abs(committedBounds.height - sourceBounds.height),
    }
    const positionError = {
      x: Math.abs(committedBounds.x - expectedCommitted.x),
      y: Math.abs(committedBounds.y - expectedCommitted.y),
    }
    if (sizeError.width > 4 || sizeError.height > 4) {
      throw new Error(
        `Desktop live acceptance committed card changed size: ${JSON.stringify({ sourceBounds, committedBounds, sizeError })}`,
      )
    }
    if (positionError.x > 4 || positionError.y > 4) {
      throw new Error(
        `Desktop live acceptance expected the dropped card to preserve its release position: ${JSON.stringify({ committedBounds, expectedCommitted, positionError })}`,
      )
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
