import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import type { ZodType } from "zod"
import type { DebugFrameOverlayStats } from "../host/types.js"
import {
  App,
  AutomationError,
  type AutomationBackend,
  type AutomationTreeNode,
  type ElementBounds,
} from "../automation.js"
import { parseAutomationTreeValue } from "./tree.js"
import {
  clockResultSchema,
  createSseDecoder,
  frameStatsResultSchema,
  encodeSse,
  getBoundsResultSchema,
  getScrollOffsetResultSchema,
  getTreeResultSchema,
  initializeResultSchema,
  okResultSchema,
  PROTOCOL_VERSION,
  screenshotResultSchema,
  type AutomationRequest,
  type AutomationResponse,
} from "./protocol.js"

type PendingResponse = (response: AutomationResponse) => void

interface PointerParams {
  x: number
  y: number
  modifiers?: string
}

interface ButtonParams extends PointerParams {
  button?: number
}

interface MoveParams extends PointerParams {
  pressedButton?: number
}

interface WheelParams extends PointerParams {
  deltaX: number
  deltaY: number
}

export class SseAutomationBackend implements AutomationBackend {
  readonly #write: (chunk: string) => void
  readonly #onClose: (() => Promise<void>) | undefined
  readonly #requestTimeoutMs: number | undefined
  readonly #pending = new Map<number, PendingResponse>()
  #nextId = 1

  constructor(
    write: (chunk: string) => void,
    feed: (listener: (chunk: string) => void) => void,
    onClose?: () => Promise<void>,
    requestTimeoutMs?: number,
  ) {
    this.#write = write
    this.#onClose = onClose
    this.#requestTimeoutMs = requestTimeoutMs

    const decoder = createSseDecoder((message) => {
      if ("method" in message) return
      const pending = this.#pending.get(message.id)
      if (pending === undefined) return
      this.#pending.delete(message.id)
      pending(message)
    })
    feed((chunk) => decoder.feed(chunk))
  }

  async initialize(): Promise<void> {
    await this.#request(
      {
        id: this.#nextId++,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          client: "gpuix-solid/automation",
        },
      },
      initializeResultSchema,
    )
  }

  async getTree(): Promise<AutomationTreeNode | null> {
    const result = await this.#request(
      { id: this.#nextId++, method: "getTree", params: {} },
      getTreeResultSchema,
    )
    return parseAutomationTreeValue(result.tree)
  }

  async getBounds(elementId: number): Promise<ElementBounds | null> {
    const result = await this.#request(
      { id: this.#nextId++, method: "getBounds", params: { elementId } },
      getBoundsResultSchema,
    )
    return result.bounds
  }

  async getScrollOffset(elementId: number): Promise<[number, number] | null> {
    const result = await this.#request(
      { id: this.#nextId++, method: "getScrollOffset", params: { elementId } },
      getScrollOffsetResultSchema,
    )
    return result.offset
  }

  async click(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: ButtonParams = { x, y }
    if (button !== undefined) params.button = button
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "click", params },
      okResultSchema,
    )
  }

  async mouseMove(
    x: number,
    y: number,
    pressedButton?: number,
    modifiers?: string,
  ): Promise<void> {
    const params: MoveParams = { x, y }
    if (pressedButton !== undefined) params.pressedButton = pressedButton
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "mouseMove", params },
      okResultSchema,
    )
  }

  async mouseDown(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: ButtonParams = { x, y }
    if (button !== undefined) params.button = button
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "mouseDown", params },
      okResultSchema,
    )
  }

  async mouseUp(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: ButtonParams = { x, y }
    if (button !== undefined) params.button = button
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "mouseUp", params },
      okResultSchema,
    )
  }

  async scrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): Promise<void> {
    const params: WheelParams = { x, y, deltaX, deltaY }
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "scrollWheel", params },
      okResultSchema,
    )
  }

  async keystrokes(elementId: number, keys: string): Promise<void> {
    await this.#request(
      {
        id: this.#nextId++,
        method: "keystrokes",
        params: { elementId, keys },
      },
      okResultSchema,
    )
  }

  async screenshot(path: string): Promise<void> {
    await this.#request(
      { id: this.#nextId++, method: "screenshot", params: { path } },
      screenshotResultSchema,
    )
  }

  async clockPause(): Promise<number> {
    return (await this.#request(
      { id: this.#nextId++, method: "clockPause", params: {} },
      clockResultSchema,
    )).nowMs
  }

  async clockSet(nowMs: number): Promise<number> {
    return (await this.#request(
      { id: this.#nextId++, method: "clockSet", params: { nowMs } },
      clockResultSchema,
    )).nowMs
  }

  async clockFastForward(deltaMs: number): Promise<number> {
    return (await this.#request(
      {
        id: this.#nextId++,
        method: "clockFastForward",
        params: { deltaMs },
      },
      clockResultSchema,
    )).nowMs
  }

  async clockResume(): Promise<number> {
    return (await this.#request(
      { id: this.#nextId++, method: "clockResume", params: {} },
      clockResultSchema,
    )).nowMs
  }

  async resetFrameStats(): Promise<void> {
    await this.#request(
      { id: this.#nextId++, method: "resetFrameStats", params: {} },
      okResultSchema,
    )
  }

  async getFrameStats(): Promise<DebugFrameOverlayStats> {
    const result = await this.#request(
      { id: this.#nextId++, method: "getFrameStats", params: {} },
      frameStatsResultSchema,
    )
    const stats: DebugFrameOverlayStats = {
      frames: result.frames,
      samples: result.samples,
    }
    if (result.currentMs !== undefined) stats.currentMs = result.currentMs
    if (result.p90Ms !== undefined) stats.p90Ms = result.p90Ms
    if (result.p99Ms !== undefined) stats.p99Ms = result.p99Ms
    if (result.maxMs !== undefined) stats.maxMs = result.maxMs
    if (result.drawRootsP90Ms !== undefined) stats.drawRootsP90Ms = result.drawRootsP90Ms
    if (result.drawRootsP99Ms !== undefined) stats.drawRootsP99Ms = result.drawRootsP99Ms
    if (result.drawRootsMaxMs !== undefined) stats.drawRootsMaxMs = result.drawRootsMaxMs
    if (result.drawRootsSamples !== undefined) stats.drawRootsSamples = result.drawRootsSamples
    if (result.prepaintP90Ms !== undefined) stats.prepaintP90Ms = result.prepaintP90Ms
    if (result.prepaintP99Ms !== undefined) stats.prepaintP99Ms = result.prepaintP99Ms
    if (result.prepaintMaxMs !== undefined) stats.prepaintMaxMs = result.prepaintMaxMs
    if (result.prepaintSamples !== undefined) stats.prepaintSamples = result.prepaintSamples
    if (result.paintP90Ms !== undefined) stats.paintP90Ms = result.paintP90Ms
    if (result.paintP99Ms !== undefined) stats.paintP99Ms = result.paintP99Ms
    if (result.paintMaxMs !== undefined) stats.paintMaxMs = result.paintMaxMs
    if (result.paintSamples !== undefined) stats.paintSamples = result.paintSamples
    if (result.rootRequestP90Ms !== undefined) stats.rootRequestP90Ms = result.rootRequestP90Ms
    if (result.rootRequestP99Ms !== undefined) stats.rootRequestP99Ms = result.rootRequestP99Ms
    if (result.rootLayoutP90Ms !== undefined) stats.rootLayoutP90Ms = result.rootLayoutP90Ms
    if (result.rootLayoutP99Ms !== undefined) stats.rootLayoutP99Ms = result.rootLayoutP99Ms
    if (result.rootPrepaintP90Ms !== undefined) stats.rootPrepaintP90Ms = result.rootPrepaintP90Ms
    if (result.rootPrepaintP99Ms !== undefined) stats.rootPrepaintP99Ms = result.rootPrepaintP99Ms
    if (result.prepaintRestP90Ms !== undefined) stats.prepaintRestP90Ms = result.prepaintRestP90Ms
    if (result.prepaintRestP99Ms !== undefined) stats.prepaintRestP99Ms = result.prepaintRestP99Ms
    if (result.scrollDivPrepaintP90Ms !== undefined) stats.scrollDivPrepaintP90Ms = result.scrollDivPrepaintP90Ms
    if (result.scrollDivPrepaintP99Ms !== undefined) stats.scrollDivPrepaintP99Ms = result.scrollDivPrepaintP99Ms
    if (result.scrollDivPrepaintMaxMs !== undefined) stats.scrollDivPrepaintMaxMs = result.scrollDivPrepaintMaxMs
    if (result.scrollDivPrepaintSamples !== undefined) stats.scrollDivPrepaintSamples = result.scrollDivPrepaintSamples
    if (result.cachedPrepaintReuseP90Ms !== undefined) stats.cachedPrepaintReuseP90Ms = result.cachedPrepaintReuseP90Ms
    if (result.cachedPrepaintReuseP99Ms !== undefined) stats.cachedPrepaintReuseP99Ms = result.cachedPrepaintReuseP99Ms
    if (result.cachedPrepaintRenderP90Ms !== undefined) stats.cachedPrepaintRenderP90Ms = result.cachedPrepaintRenderP90Ms
    if (result.cachedPrepaintRenderP99Ms !== undefined) stats.cachedPrepaintRenderP99Ms = result.cachedPrepaintRenderP99Ms
    if (result.cachedPrepaintHits !== undefined) stats.cachedPrepaintHits = result.cachedPrepaintHits
    if (result.cachedPrepaintMisses !== undefined) stats.cachedPrepaintMisses = result.cachedPrepaintMisses
    if (result.cachedPrepaintColdMisses !== undefined) stats.cachedPrepaintColdMisses = result.cachedPrepaintColdMisses
    if (result.cachedPrepaintKeyMisses !== undefined) stats.cachedPrepaintKeyMisses = result.cachedPrepaintKeyMisses
    if (result.cachedPrepaintDirtyMisses !== undefined) stats.cachedPrepaintDirtyMisses = result.cachedPrepaintDirtyMisses
    if (result.cachedPrepaintRefreshingMisses !== undefined) stats.cachedPrepaintRefreshingMisses = result.cachedPrepaintRefreshingMisses
    if (result.canvasPrepareP90Ms !== undefined) stats.canvasPrepareP90Ms = result.canvasPrepareP90Ms
    if (result.canvasPrepareP99Ms !== undefined) stats.canvasPrepareP99Ms = result.canvasPrepareP99Ms
    if (result.canvasPrepareMaxMs !== undefined) stats.canvasPrepareMaxMs = result.canvasPrepareMaxMs
    if (result.canvasPrepareSamples !== undefined) stats.canvasPrepareSamples = result.canvasPrepareSamples
    if (result.viewRenderCurrentMs !== undefined) stats.viewRenderCurrentMs = result.viewRenderCurrentMs
    if (result.viewRenderP90Ms !== undefined) stats.viewRenderP90Ms = result.viewRenderP90Ms
    if (result.viewRenderP99Ms !== undefined) stats.viewRenderP99Ms = result.viewRenderP99Ms
    if (result.viewRenderMaxMs !== undefined) stats.viewRenderMaxMs = result.viewRenderMaxMs
    if (result.viewRenderSamples !== undefined) stats.viewRenderSamples = result.viewRenderSamples
    if (result.viewBuildCurrentMs !== undefined) stats.viewBuildCurrentMs = result.viewBuildCurrentMs
    if (result.viewBuildP90Ms !== undefined) stats.viewBuildP90Ms = result.viewBuildP90Ms
    if (result.viewBuildP99Ms !== undefined) stats.viewBuildP99Ms = result.viewBuildP99Ms
    if (result.viewBuildMaxMs !== undefined) stats.viewBuildMaxMs = result.viewBuildMaxMs
    if (result.viewBuildSamples !== undefined) stats.viewBuildSamples = result.viewBuildSamples
    if (result.rootSubtreeRevision !== undefined) stats.rootSubtreeRevision = result.rootSubtreeRevision
    return stats
  }

  async close(): Promise<void> {
    for (const [id, pending] of this.#pending) {
      pending({
        id,
        error: {
          code: "Closed",
          message: `Automation request ${id} cancelled because the connection closed`,
        },
      })
    }
    this.#pending.clear()
    await this.#onClose?.()
  }

  #request<Result>(
    request: AutomationRequest,
    schema: ZodType<Result>,
  ): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      this.#pending.set(request.id, (response) => {
        if (timer !== undefined) clearTimeout(timer)
        if ("error" in response) {
          reject(new AutomationError(response.error.code, response.error.message))
          return
        }
        const parsed = schema.safeParse(response.result)
        if (!parsed.success) {
          reject(new AutomationError(
            "Protocol",
            `Invalid result for ${request.method}: ${parsed.error.message}`,
          ))
          return
        }
        resolve(parsed.data)
      })

      if (this.#requestTimeoutMs !== undefined) {
        timer = setTimeout(() => {
          if (!this.#pending.delete(request.id)) return
          reject(new AutomationError(
            "Timeout",
            `Automation request ${request.method} timed out after ${this.#requestTimeoutMs}ms`,
          ))
        }, this.#requestTimeoutMs)
        timer.unref()
      }

      try {
        this.#write(encodeSse(request))
      } catch (error) {
        this.#pending.delete(request.id)
        if (timer !== undefined) clearTimeout(timer)
        reject(error)
      }
    })
  }
}

export async function connectStdio(options: {
  write: (chunk: string) => void
  feed: (listener: (chunk: string) => void) => void
  close?: () => Promise<void>
  requestTimeoutMs?: number | undefined
}): Promise<App> {
  const backend = new SseAutomationBackend(
    options.write,
    options.feed,
    options.close,
    options.requestTimeoutMs,
  )
  await backend.initialize()
  return new App(backend)
}

export async function launch(options: {
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  requestTimeoutMs?: number | undefined
}): Promise<App> {
  const child: ChildProcessWithoutNullStreams = spawn(
    options.command,
    options.args ?? [],
    {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  )

  return await connectStdio({
    write(chunk) {
      child.stdin.write(chunk)
    },
    feed(listener) {
      child.stdout.on("data", (buffer: Buffer) => listener(buffer.toString("utf8")))
    },
    async close() {
      child.kill()
    },
    requestTimeoutMs: options.requestTimeoutMs,
  })
}
