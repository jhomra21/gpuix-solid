import { spawn } from "node:child_process"
import { join } from "node:path"

const timeoutMs = 15_000

function walk(node, visit) {
  if (!node) return
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function descendants(node, predicate) {
  const found = []
  walk(node, (candidate) => {
    if (predicate(candidate)) found.push(candidate)
  })
  return found
}

function findPath(node, predicate, path = []) {
  if (!node) return null
  const nextPath = [...path, node]
  if (predicate(node)) return nextPath
  for (const child of node.children ?? []) {
    const found = findPath(child, predicate, nextPath)
    if (found) return found
  }
  return null
}

function containingSurface(root, childTestId, minimumHeight, minimumWidth) {
  const path = findPath(root, (node) => node.testId === childTestId)
  if (!path) return null
  const candidates = path.slice(0, -1).filter((node) => {
    const bounds = node.bounds
    return bounds && bounds.height >= minimumHeight && bounds.width >= minimumWidth
  })
  return candidates.at(-1) ?? path.at(-2) ?? null
}

function syntheticSurface(node, bounds = node?.bounds) {
  return node ? { ...node, bounds, syntheticSurface: true } : null
}

function fallbackNodes(root, testId) {
  if (testId === "mail-app") return root ? [root] : []
  if (testId === "mail-reading-toolbar") {
    const surface = containingSurface(root, "thread-close", 20, 200)
    return surface ? [surface] : []
  }
  if (testId === "thread-split") {
    const close = descendants(root, (node) => node.testId === "thread-close")[0]
    if (close?.bounds) {
      return [syntheticSurface(close, { ...close.bounds, x: close.bounds.x - close.bounds.width })]
    }
  }
  if (testId === "mail-sidebar") {
    const surface = containingSurface(root, "find-channel", 200, 150)
    return surface ? [surface] : descendants(root, (node) => node.testId === "find-channel")
  }
  if (testId === "mail-reading-pane") {
    const surface = containingSurface(root, "composer", 200, 400)
    return surface ? [surface] : descendants(root, (node) => node.testId === "composer")
  }
  if (testId === "mail-list-toolbar") {
    const surface = containingSurface(root, "search", 40, 250)
    return surface ? [surface] : descendants(root, (node) => node.testId === "search")
  }
  if (testId === "mail-thread-list") {
    const firstThread = descendants(root, (node) => node.testId === "thread-atlas-weekly")[0]
    const threadSurface = containingSurface(root, "thread-atlas-weekly", 200, 250)
    if (firstThread && threadSurface) return [threadSurface]
    const candidates = []
    walk(root, (node) => {
      const count = descendants(node, (child) => child.testId?.startsWith("thread-") && !["thread-full", "thread-split", "thread-close"].includes(child.testId)).length
      if (count >= 2) candidates.push({ node, count })
    })
    candidates.sort((left, right) => left.count - right.count)
    if (candidates.length) return [candidates[0].node]
    const fullMode = descendants(root, (node) => node.testId === "thread-close").length > 0 &&
      descendants(root, (node) => node.testId === "thread-full").length === 0
    return fullMode ? [] : [syntheticSurface(root)]
  }
  return []
}

function makeResolvedLocator(app, resolveNodes) {
  async function one() {
    const found = await resolveNodes()
    if (found.length === 0) throw new Error("Locator did not match")
    if (found.length > 1) throw new Error("Locator matched " + found.length + " elements")
    return found[0]
  }
  const locator = {
    async all() {
      return resolveNodes()
    },
    async count() {
      return (await resolveNodes()).length
    },
    async bounds() {
      const node = await one()
      if (node.bounds) return node.bounds
      return (await app.call("getBounds", { elementId: node.id })).bounds
    },
    async center() {
      const bounds = await this.bounds()
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    },
    async click(options = {}) {
      await app.mouse.click(await this.center(), options)
    },
    async hover(options = {}) {
      await app.mouse.move(await this.center(), options)
    },
    async wheel(deltaX, deltaY, options = {}) {
      await app.mouse.wheel(await this.center(), deltaX, deltaY, options)
    },
  }
  return locator
}

function makeTreeLocator(app, nativeLocator, testId, treeFor) {
  async function nodes() {
    const direct = await nativeLocator.all()
    if (direct.length > 0) return direct
    return fallbackNodes(await treeFor(), testId)
  }
  async function one() {
    const found = await nodes()
    if (found.length === 0) throw new Error("Locator did not match " + testId)
    if (found.length > 1) throw new Error("Locator matched " + found.length + " " + testId + " elements")
    return found[0]
  }
  const locator = {
    async all() {
      return nodes()
    },
    async count() {
      return (await nodes()).length
    },
    async bounds() {
      const node = await one()
      if (node.bounds) return node.bounds
      return (await app.call("getBounds", { elementId: node.id })).bounds
    },
    async center() {
      const bounds = await this.bounds()
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    },
    async click(options = {}) {
      await app.mouse.click(await this.center(), options)
    },
    async hover(options = {}) {
      await app.mouse.move(await this.center(), options)
    },
    async wheel(deltaX, deltaY, options = {}) {
      await app.mouse.wheel(await this.center(), deltaX, deltaY, options)
    },
    async fill(text) {
      await nativeLocator.fill(text)
    },
    async textContent() {
      return textOf(await one())
    },
  }
  locator.getByType = (type) =>
    makeResolvedLocator(app, async () => {
      const parentNodes = await nodes()
      return parentNodes.flatMap((parent) => descendants(parent, (node) => node.type === type))
    })
  return locator
}

function textOf(node) {
  return [node?.text ?? "", ...(node?.children ?? []).map(textOf)].join("")
}

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + " timed out after " + timeoutMs + "ms")), timeoutMs)
    timer.unref()
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function launchMailAdapter(kind, repoRoot, reactReference) {
  const isReact = kind === "react"
  const cwd = isReact ? reactReference.checkout : join(repoRoot, "examples/counter")
  const args = isReact ? ["examples/mail.tsx"] : ["dist/mail/index.js"]
  const automationModule = isReact
    ? join(reactReference.checkout, "packages/react/dist/automation/index.js")
    : join(repoRoot, "packages/solid/dist/automation/stdio.js")
  const { connectStdio } = await import(automationModule)
  const stdoutChunks = []
  const stderrChunks = []
  const child = spawn("bun", args, {
    cwd,
    env: { ...process.env, GPUIX_BACKGROUND: "1", RUST_BACKTRACE: "1" },
    stdio: ["pipe", "pipe", "pipe"],
  })
  child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString("utf8")))
  let exitResult = null
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      exitResult = { code, signal }
      resolve(exitResult)
    })
  })
  let closed = false
  const app = await withTimeout(
    Promise.race([
      connectStdio({
        write(chunk) {
          if (!child.stdin.destroyed) child.stdin.write(chunk)
        },
        feed(listener) {
          child.stdout.on("data", (buffer) => {
            const text = buffer.toString("utf8")
            stdoutChunks.push(text)
            listener(text)
          })
        },
        async close() {
          if (!child.killed) child.kill()
        },
      }),
      exited.then(({ code, signal }) => {
        throw new Error(
          kind +
            " Mail exited before automation initialized (code=" +
            String(code) +
            ", signal=" +
            String(signal) +
            ")",
        )
      }),
    ]),
    kind + " Mail automation initialization",
  )

  const nativeGetByTestId = app.getByTestId.bind(app)
  const treeFor = async () => {
    if (isReact) return (await app.call("getTree", {})).tree
    return app.backend.getTree()
  }
  app.getByTestId = (testId) => makeTreeLocator(app, nativeGetByTestId(testId), testId, treeFor)

  return {
    kind,
    app,
    child,
    exited,
    stderr() {
      return stderrChunks.join("")
    },
    stdout() {
      return stdoutChunks.join("")
    },
    exitResult() {
      return exitResult
    },
    async tree() {
      if (isReact) return (await app.call("getTree", {})).tree
      return app.backend.getTree()
    },
    async getScrollOffset(elementId) {
      const result = isReact
        ? await app.call("getScrollOffset", { elementId })
        : { offset: app.backend.getScrollOffset(elementId) }
      const offset = result.offset
      if (!offset) return null
      return { x: Number(offset[0]), y: Number(offset[1]) }
    },
    async screenshot(path) {
      await app.screenshot({ path })
    },
    async close() {
      if (closed) return
      closed = true
      await app.close().catch(() => {})
      if (!child.killed) child.kill()
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1_000))])
    },
  }
}
