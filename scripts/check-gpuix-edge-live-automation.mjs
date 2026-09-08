import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../packages/solid/dist/automation/stdio.js"

const counterDirectory = fileURLToPath(new URL("../examples/counter/", import.meta.url))
const timeoutMs = 15_000
const settleMs = 25

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function processError(name, exit, stderrChunks) {
  const stderr = stderrChunks.join("").trim()
  return new Error(
    `live ${name} exited before automation completed (code=${String(exit.code)}, signal=${String(exit.signal)})${stderr ? `\n${stderr}` : ""}`,
  )
}

async function runExample({ name, entry, test }) {
  const stderrChunks = []
  const child = spawn("bun", [entry], {
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

  const step = async (label, operation) => {
    let timer
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${name}: ${label} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      )
      timer.unref()
    })
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        exited.then((result) => { throw processError(name, result, stderrChunks) }),
        timedOut,
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  let app
  try {
    app = await step("automation initialization", () => connectStdio({
      write(chunk) {
        child.stdin.write(chunk)
      },
      feed(listener) {
        child.stdout.on("data", (buffer) => listener(buffer.toString("utf8")))
      },
      async close() {
        if (!child.killed) child.kill()
      },
    }))

    const expectText = async (locator, expected, label, options = {}) => {
      await step(label, async () => {
        const deadline = Date.now() + 5_000
        let actual = ""
        for (;;) {
          actual = (await locator.textContent()).trim()
          const matches = options.includes ? actual.includes(expected) : actual === expected
          if (matches) return
          if (Date.now() >= deadline) {
            throw new Error(
              `${name}: ${label} expected ${options.includes ? "text containing" : "text"} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
            )
          }
          await delay(settleMs)
        }
      })
    }

    const expectCount = async (locator, expected, label) => {
      await step(label, async () => {
        const deadline = Date.now() + 5_000
        let actual = -1
        for (;;) {
          actual = await locator.count()
          if (actual === expected) return
          if (Date.now() >= deadline) {
            throw new Error(`${name}: ${label} expected count ${expected}, got ${actual}`)
          }
          await delay(settleMs)
        }
      })
    }

    const expectPresent = async (locator, label) => {
      await expectCount(locator, 1, label)
    }

    await test({ app, step, expectText, expectCount, expectPresent })
    await step("final tree read", () => app.backend.getTree())
    console.log(`GPUIX source-edge live automation: ${name} passed`)
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
}

const examples = [
  {
    name: "Counter",
    entry: "dist/counter/index.js",
    async test({ app, step, expectText }) {
      const increment = app.getByTestId("counter-increment")
      const value = app.getByTestId("counter-value")
      await expectText(value, "0", "initial value")
      await step("hover increment", () => increment.hover())
      await step("click increment", () => increment.click())
      await expectText(value, "1", "reactive increment")
    },
  },
  {
    name: "Native Text",
    entry: "dist/native-text/native-text.js",
    async test({ app, step, expectPresent }) {
      await expectPresent(app.getByText("Why"), "markdown surface")
      await step("open code tab", () => app.getByText("code").click())
      await expectPresent(app.getByText("typescript"), "code block")
      await step("open diff tab", () => app.getByText("diff").click())
      await expectPresent(app.getByText("8080"), "diff update")
      await step("restore markdown tab", () => app.getByText("markdown").click())
      await expectPresent(app.getByText("Why"), "restored markdown surface")
    },
  },
  {
    name: "Blurred Window",
    entry: "dist/blurred-window/blurred-window.js",
    async test({ app, step, expectPresent }) {
      await step("fill username", () => app.getByTestId("username").fill("Edge User"))
      await step("wait for animated submit", () => app.getByTestId("username-submit").waitFor({ timeoutMs: 5_000 }))
      await step("submit username", () => app.getByTestId("username-submit").click())
      await expectPresent(app.getByText("Good morning, Edge User"), "welcome state")
    },
  },
  {
    name: "Todo",
    entry: "dist/todo/index.js",
    async test({ app, step, expectPresent, expectText }) {
      await expectText(app.getByTestId("view-title"), "Today", "initial view")
      await step("open inbox", () => app.getByTestId("view-inbox").click())
      await expectText(app.getByTestId("view-title"), "Inbox", "inbox view")
      await step("return to today", () => app.getByTestId("view-today").click())
      await step("fill task composer", () => app.getByTestId("composer").fill("Live stdio task"))
      await step("add task", () => app.getByTestId("add").click())
      await expectPresent(app.getByText("Live stdio task"), "new task")
      await expectText(app.getByTestId("view-count"), "3", "updated task count")
    },
  },
  {
    name: "Diff",
    entry: "dist/diff/index.js",
    async test({ app, step, expectPresent }) {
      await expectPresent(app.getByTestId("diff-shell"), "diff shell")
      await expectPresent(app.getByText("createSignal"), "source diff text")
      await step("hover diff content", () => app.getByText("createSignal").hover())
      await step("wheel diff viewport", () => app.getByTestId("diff-shell").wheel(0, -180))
    },
  },
  {
    name: "Timeline",
    entry: "dist/timeline/index.js",
    async test({ app, step, expectText }) {
      await expectText(app.getByTestId("cull-toggle"), "cull on", "initial culling state")
      await step("toggle culling", () => app.getByTestId("cull-toggle").click())
      await expectText(app.getByTestId("cull-toggle"), "cull off", "updated culling state")
      await step("scroll media bin", () => app.getByTestId("media-bin").wheel(-60, -40))
      await step("hover timeline playhead", () => app.getByTestId("timeline-playhead").hover())
    },
  },
  {
    name: "Mail",
    entry: "dist/mail/index.js",
    async test({ app, step, expectCount, expectPresent }) {
      await expectPresent(app.getByTestId("mail-app"), "mail shell")
      await step("search mail", () => app.getByTestId("search").fill("Nora"))
      await expectPresent(app.getByTestId("thread-nora"), "filtered Nora thread")
      await expectCount(app.getByTestId("thread-atlas-weekly"), 0, "filtered Atlas thread")
      await step("clear mail search", () => app.getByTestId("search").fill(""))
      await step("open Promotions", () => app.getByTestId("channel-promotions").click())
      await expectPresent(app.getByTestId("thread-lighthouse"), "Promotions thread")
      await step("open Atlas from sidebar", () => app.getByTestId("nav-thread-atlas-weekly").click())
      await expectPresent(app.getByTestId("thread-split"), "full reader split control")
      await step("split reader", () => app.getByTestId("thread-split").click())
      await expectPresent(app.getByTestId("thread-full"), "split reader full control")
    },
  },
  {
    name: "Diffusion",
    entry: "dist/diffusion/index.js",
    async test({ app, step, expectCount, expectPresent, expectText }) {
      await expectPresent(app.getByTestId("diffusion-editor"), "editor shell")
      await expectText(app.getByTestId("diffusion-soundboard-left-volume-value"), "-3 dB", "initial volume")
      await step("change left volume", () => app.getByTestId("diffusion-soundboard-left-volume").click())
      await expectText(app.getByTestId("diffusion-soundboard-left-volume-value"), "-6 dB", "updated volume")
      await step("open project menu", () => app.getByTestId("diffusion-project-menu").click())
      await expectPresent(app.getByTestId("diffusion-project-menu-content"), "project menu")
      await step("open View submenu", () => app.getByTestId("diffusion-project-menu-content").getByText("View").click())
      await step("zoom in", () => app.getByTestId("diffusion-project-menu-content").getByText("Zoom in").click())
      await expectPresent(app.getByText("125%"), "zoom result")
      await step("toggle playback", () => app.getByTestId("diffusion-play").click())
      await expectText(app.getByTestId("diffusion-play"), "Ⅱ", "playing state")
      await step("hide editor chrome", () => app.getByTestId("diffusion-toggle-ui").click())
      await expectCount(app.getByTestId("diffusion-sidebar-left"), 0, "hidden sidebar")
      await step("restore editor chrome", () => app.getByTestId("diffusion-show-ui").click())
      await expectPresent(app.getByTestId("diffusion-sidebar-left"), "restored sidebar")
    },
  },
  {
    name: "Chat",
    entry: "dist/chat/index.js",
    async test({ app, step, expectPresent }) {
      await expectPresent(app.getByText("DeepSeek V4 Flash"), "initial model")
      await step("open model picker", () => app.getByTestId("model-picker").click())
      await expectPresent(app.getByText("Claude Opus 4.6"), "model option")
      await step("select model", () => app.getByText("Claude Opus 4.6").click())
      await expectPresent(app.getByText("Claude Opus 4.6"), "selected model")
      await step("fill composer", () => app.getByType("textarea").fill("live stdio hello"))
      await step("submit composer", () => app.getByType("textarea").press("enter"))
      await step("wheel transcript", () => app.getByType("virtual-list").wheel(0, -260))
    },
  },
  {
    name: "Infinite Chat",
    entry: "dist/infinite-chat/index.js",
    async test({ app, step, expectPresent, expectText }) {
      await expectText(app.getByTestId("infinite-route"), "/messages/latest", "initial route")
      const transcript = app.getByType("virtual-list")
      const transcriptBounds = await step("read transcript bounds", () => transcript.bounds())
      const latestIndexes = Array.from({ length: 12 }, (_, offset) => 388 + offset)
      let visibleLink
      let target
      for (const index of latestIndexes.reverse()) {
        const targetIndex = (index * 7 + 13) % 400
        const label = `Open message ${String(targetIndex).padStart(3, "0")}`
        const locator = app.getByText(label)
        if (await step(`find ${label}`, () => locator.count()) !== 1) continue
        try {
          const bounds = await step(`read ${label} bounds`, () => locator.bounds())
          const transcriptBottom = transcriptBounds.y + transcriptBounds.height
          const linkBottom = bounds.y + bounds.height
          if (bounds.y >= transcriptBounds.y && linkBottom <= transcriptBottom) {
            visibleLink = locator
            target = `message-${String(targetIndex).padStart(3, "0")}`
            break
          }
        } catch {
          // Virtualized rows can exist in the automation tree without a painted hit surface.
        }
      }
      assert.ok(visibleLink && target, "Infinite Chat should expose a painted MDX link on the latest page")
      await step("click visible MDX link", () => visibleLink.click())
      await expectText(app.getByTestId("infinite-route"), `/messages/${target}`, "MDX route navigation")
      await expectPresent(app.getByTestId(`message-${target}`), "routed message")
    },
  },
  {
    name: "Dashboard",
    entry: "dist/dashboard/index.js",
    async test({ app, step, expectPresent, expectText }) {
      await expectText(app.getByTestId("page-title"), "Home", "initial route")
      await step("open API result", () => app.getByTestId("test-api").click())
      await expectPresent(app.getByText("Hello from the API"), "API result")
      await step("close API result", () => app.getByTestId("close-api").click())
      await step("open Tasks route", () => app.getByTestId("nav-tasks").click())
      await expectText(app.getByTestId("page-title"), "Tasks", "Tasks route")
      await step("fill task", () => app.getByTestId("task-input").fill("Live dashboard task"))
      await step("add task", () => app.getByTestId("task-add").click())
      await expectPresent(app.getByText("Live dashboard task"), "dashboard task")
    },
  },
  {
    name: "CodeImage",
    entry: "dist/codeimage/index.js",
    async test({ app, step, expectPresent, expectText }) {
      await expectText(app.getByTestId("theme-label"), "Tokyo Night", "initial theme")
      await step("hover theme tool", () => app.getByTestId("tool-theme").hover())
      await step("open theme tool", () => app.getByTestId("tool-theme").click())
      await expectPresent(app.getByTestId("theme-rose"), "theme option")
      await step("select Rosé Pine", () => app.getByTestId("theme-rose").click())
      await expectText(app.getByTestId("theme-label"), "Rosé Pine", "updated theme")
      await step("fill filename", () => app.getByTestId("filename-input").fill("live-stdio.tsx"))
      await expectText(app.getByTestId("preview-filename"), "live-stdio.tsx", "updated filename")
      await step("export preview", () => app.getByTestId("export-button").click())
      await expectText(app.getByTestId("export-status"), "Exported 1 preview", "export status", { includes: true })
    },
  },
  {
    name: "TanStack Kitchen Sink",
    entry: "dist/tanstack-kitchen-sink/index.js",
    async test({ app, step, expectPresent, expectText }) {
      await expectPresent(app.getByTestId("page-dashboard"), "dashboard route")
      await expectText(app.getByTestId("invoice-count"), "10 total invoices.", "initial invoice count")
      await step("open invoices", () => app.getByTestId("dashboard-tab-invoices").click())
      await expectPresent(app.getByTestId("invoice-create-panel"), "invoice form")
      await step("fill invoice title", () => app.getByTestId("create-title").fill("Live stdio invoice"))
      await step("fill invoice body", () => app.getByTestId("create-body").fill("Created through source-main automation"))
      await step("create invoice", () => app.getByTestId("create-invoice-submit").click())
      await expectPresent(app.getByTestId("invoice-row-11"), "created invoice")
      await step("open users", () => app.getByTestId("dashboard-tab-users").click())
      await expectPresent(app.getByTestId("users-workspace"), "users route")
      await step("filter users", () => app.getByTestId("users-filter").fill("Clementine"))
      await expectPresent(app.getByTestId("user-row-3"), "filtered user")
    },
  },
]

for (const example of examples) await runExample(example)

console.log(`GPUIX source-edge live automation: all ${examples.length} Solid 2 examples passed end to end`)
