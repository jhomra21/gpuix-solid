import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../packages/solid/dist/automation/stdio.js"

const counterDirectory = fileURLToPath(new URL("../examples/counter/", import.meta.url))
const timeoutMs = 10_000
const stderrChunks = []

function timeout(label) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs).unref()
  })
}

const child = spawn("bun", ["dist/counter/index.js"], {
  cwd: counterDirectory,
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
})

child.stderr.on("data", (chunk) => {
  stderrChunks.push(chunk.toString("utf8"))
})

const exited = new Promise((_, reject) => {
  child.once("exit", (code, signal) => {
    const stderr = stderrChunks.join("").trim()
    reject(new Error(
      `live Counter exited before automation completed (code=${String(code)}, signal=${String(signal)})${stderr ? `\n${stderr}` : ""}`,
    ))
  })
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
    exited,
    timeout("live automation initialization"),
  ])

  const increment = app.getByTestId("counter-increment")
  const counterValue = app.getByTestId("counter-value")

  const initial = (await Promise.race([
    counterValue.textContent(),
    exited,
    timeout("initial live automation tree read"),
  ])).trim()
  if (initial !== "0") throw new Error(`expected live Counter to start at 0, got ${JSON.stringify(initial)}`)

  await Promise.race([
    increment.hover(),
    exited,
    timeout("live automation hover"),
  ])
  await Promise.race([
    increment.click(),
    exited,
    timeout("live automation click"),
  ])

  const updated = (await Promise.race([
    counterValue.textContent(),
    exited,
    timeout("post-click live automation tree read"),
  ])).trim()
  if (updated !== "1") throw new Error(`expected live Counter click to commit 1, got ${JSON.stringify(updated)}`)

  console.log("GPUIX source-edge live automation: hover + click + reactive commit passed")
} finally {
  if (app) await app.close().catch(() => {})
  if (!child.killed) child.kill()
}
