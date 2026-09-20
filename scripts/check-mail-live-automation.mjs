import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../packages/solid/dist/automation/stdio.js"

const counterDirectory = fileURLToPath(new URL("../examples/counter/", import.meta.url))
const timeoutMs = 15_000
const settleMs = 25
const screenshotPath = process.env.MAIL_ACCEPTANCE_SCREENSHOT ?? join(tmpdir(), "gpuix-solid-mail-acceptance.png")
const fatalNativePattern = /cannot update .*GpuixView|already being updated|fatal runtime error|failed to initiate panic|SIGABRT|thread .* panicked/i

const channels = [
  { id: "primary", threads: ["nora", "jules", "kenji", "atlas-weekly", "lea-july"], outside: "lighthouse" },
  { id: "promotions", threads: ["lighthouse", "welcome"], outside: "nora" },
  { id: "social", threads: ["invite"], outside: "nora" },
  { id: "updates", threads: ["year-review", "lea-30", "lea-29", "beta"], outside: "nora" },
  { id: "forums", threads: ["harbor", "parts"], outside: "nora" },
  { id: "notifications", threads: ["invoice", "sites", "security"], outside: "nora" },
]

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function processError(exit, stderrChunks) {
  const stderr = stderrChunks.join("").trim()
  return new Error(
    `Mail live acceptance exited before automation completed (code=${String(exit.code)}, signal=${String(exit.signal)})${stderr ? `\n${stderr}` : ""}`,
  )
}

const stderrChunks = []
const child = spawn("bun", ["dist/mail/index.js"], {
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
      () => reject(new Error(`Mail live acceptance: ${label} timed out after ${timeoutMs}ms`)),
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

  const expectCount = async (locator, expected, label) => {
    await step(label, async () => {
      const deadline = Date.now() + 5_000
      let actual = -1
      for (;;) {
        actual = await locator.count()
        if (actual === expected) return
        if (Date.now() >= deadline) {
          throw new Error(`Mail live acceptance: ${label} expected count ${expected}, got ${actual}`)
        }
        await delay(settleMs)
      }
    })
  }

  const expectPresent = async (locator, label) => expectCount(locator, 1, label)
  const expectAbsent = async (locator, label) => expectCount(locator, 0, label)

  await expectPresent(app.getByTestId("mail-app"), "mail shell")
  await expectPresent(app.getByTestId("mail-sidebar"), "sidebar")
  await expectPresent(app.getByTestId("mail-list-toolbar"), "list toolbar")
  await expectPresent(app.getByTestId("mail-thread-list"), "thread list")
  await expectPresent(app.getByTestId("mail-reading-toolbar"), "reading toolbar")
  await expectPresent(app.getByTestId("mail-reading-pane"), "reading pane")
  await expectPresent(app.getByText("Atlas Weekly"), "default Atlas thread")
  await expectCount(app.getByTestId("mail-reading-pane").getByType("img"), 4, "newsletter HTTP image surface")
  await step("settle remote Mail images", () => delay(2_000))

  await step("capture default Mail screenshot", () => app.screenshot({ path: screenshotPath }))

  const search = app.getByTestId("search")
  await step("search by sender", () => search.fill("Nora"))
  await expectPresent(app.getByTestId("thread-nora"), "sender search result")
  await expectAbsent(app.getByTestId("thread-atlas-weekly"), "sender search exclusion")
  await step("search by subject", () => search.fill("Desk notes"))
  await expectPresent(app.getByTestId("thread-nora"), "subject search result")
  await step("search by snippet", () => search.fill("shared folder"))
  await expectPresent(app.getByTestId("thread-nora"), "snippet search result")
  await step("search no-results state", () => search.fill("no such thread"))
  await expectAbsent(app.getByTestId("thread-nora"), "no-results state")
  await step("clear thread search", () => search.fill(""))
  await expectPresent(app.getByTestId("thread-atlas-weekly"), "restored thread search")

  const channelSearch = app.getByTestId("find-channel")
  await step("filter channels", () => channelSearch.fill("promo"))
  await expectPresent(app.getByTestId("channel-promotions"), "channel filter result")
  await expectAbsent(app.getByTestId("channel-primary"), "channel filter exclusion")
  await expectAbsent(app.getByTestId("channel-notifications"), "channel filter second exclusion")
  await step("clear channel filter", () => channelSearch.fill(""))
  for (const { id } of channels) {
    await expectPresent(app.getByTestId(`channel-${id}`), `restored ${id} channel`)
  }

  for (const { id, threads, outside } of channels) {
    await step(`open ${id} channel`, () => app.getByTestId(`channel-${id}`).click())
    await expectPresent(app.getByTestId("mail-thread-list"), `${id} thread list`)
    await expectAbsent(app.getByTestId("mail-reading-pane"), `${id} closes reader`)
    await expectAbsent(app.getByTestId(`thread-${outside}`), `${id} excludes another channel`)

    for (const threadId of threads) {
      await expectPresent(app.getByTestId(`thread-${threadId}`), `${id}/${threadId} timeline row`)
      await step(`open ${id}/${threadId}`, () => app.getByTestId(`thread-${threadId}`).click())
      await expectPresent(app.getByTestId("mail-reading-pane"), `${id}/${threadId} reader`)
      await expectPresent(app.getByTestId("composer"), `${id}/${threadId} composer`)
    }
  }

  await step("restore Primary channel", () => app.getByTestId("channel-primary").click())
  await expectPresent(app.getByTestId("thread-nora"), "Primary restores Nora thread")
  await step("open Nora timeline thread", () => app.getByTestId("thread-nora").click())
  await expectPresent(
    app.getByTestId("mail-reading-pane").getByText("Desk notes"),
    "direct-message reader subject",
  )

  await step("fill composer", () => app.getByTestId("composer").fill("Mail live acceptance draft"))
  await step("replace composer draft", () => app.getByTestId("composer").fill("Second draft"))

  await step("open Atlas timeline thread", () => app.getByTestId("thread-atlas-weekly").click())
  await expectPresent(app.getByTestId("thread-full"), "split reader full control")
  await step("expand reader", () => app.getByTestId("thread-full").click())
  await expectAbsent(app.getByTestId("mail-thread-list"), "full reader hides thread list")
  await expectAbsent(app.getByTestId("mail-list-toolbar"), "full reader hides list toolbar")
  await expectPresent(app.getByTestId("thread-split"), "full reader split control")
  await step("restore split reader", () => app.getByTestId("thread-split").click())
  await expectPresent(app.getByTestId("mail-thread-list"), "split reader restores list")
  await expectPresent(app.getByTestId("thread-full"), "split reader restores full control")

  await step("close reader", () => app.getByTestId("thread-close").click())
  await expectAbsent(app.getByTestId("mail-reading-pane"), "closed reader")
  await expectAbsent(app.getByTestId("mail-reading-toolbar"), "closed reader toolbar")
  await expectPresent(app.getByTestId("mail-thread-list"), "closed reader keeps list")

  await step("open Atlas from sidebar", () => app.getByTestId("nav-thread-atlas-weekly").click())
  await expectAbsent(app.getByTestId("mail-thread-list"), "sidebar thread opens full reader")
  await expectPresent(app.getByTestId("thread-split"), "sidebar full-reader split control")
  await step("split sidebar-opened reader", () => app.getByTestId("thread-split").click())

  await step("scroll sidebar", () => app.getByTestId("mail-sidebar").wheel(0, -240))
  await step("scroll timeline", () => app.getByTestId("mail-thread-list").wheel(0, -180))
  await step("scroll reading pane", () => app.getByTestId("mail-reading-pane").wheel(0, -260))

  const selectable = app.getByText("Lea sent the weekly recap")
  const bounds = await step("measure selectable message", () => selectable.bounds())
  const start = {
    x: bounds.x + Math.min(12, Math.max(2, bounds.width / 8)),
    y: bounds.y + Math.min(10, Math.max(2, bounds.height / 2)),
  }
  const end = {
    x: Math.max(start.x + 2, Math.min(bounds.x + bounds.width - 4, start.x + 160)),
    y: start.y,
  }
  await step("drag-select message text", () => app.mouse.drag(start, end, { steps: 12 }))
  await step("read tree after selection release", () => app.backend.getTree())

  const stderr = stderrChunks.join("")
  if (fatalNativePattern.test(stderr)) {
    throw new Error(`Mail live acceptance saw fatal native output:\n${stderr.trim()}`)
  }

  console.log(`Mail live acceptance passed. Screenshot: ${screenshotPath}`)
  console.log("Validated: upstream HTTP avatars/banner, search sender/subject/snippet/no-results, channel filter, all 6 channels, all 17 timeline rows, DM and newsletter readers, composer input, split/full/closed modes, sidebar full-reader navigation, three scroll surfaces, and real text drag/release.")
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
