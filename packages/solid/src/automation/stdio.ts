import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import type { ZodType } from "zod"
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
  encodeSse,
  getBoundsResultSchema,
  getTreeResultSchema,
  initializeResultSchema,
  okResultSchema,
  PROTOCOL_VERSION,
  screenshotResultSchema,
  type AutomationRequest,
  type AutomationResponse,
} from "./protocol.js"

type PendingResponse = (response: AutomationResponse) => void

export class SseAutomationBackend implements AutomationBackend {
  readonly #write: (chunk: string) => void
  readonly #onClose: (() => Promise<void>) | undefined
  readonly #pending = new Map<number, PendingResponse>()
  #nextId = 1

  constructor(
    write: (chunk: string) => void,
    feed: (listener: (chunk: string) => void) => void,
    onClose?: () => Promise<void>,
  ) {
    this.#write = write
    this.#onClose = onClose

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

  async click(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: { x: number; y: number; button?: number; modifiers?: string } = { x, y }
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
    const params: {
      x: number
      y: number
      pressedButton?: number
      modifiers?: string
    } = { x, y }
    if (pressedButton !== undefined) params.pressedButton = pressedButton
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "mouseMove", params },
      okResultSchema,
    )
  }

  async mouseDown(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: { x: number; y: number; button?: number; modifiers?: string } = { x, y }
    if (button !== undefined) params.button = button
    if (modifiers !== undefined) params.modifiers = modifiers
    await this.#request(
      { id: this.#nextId++, method: "mouseDown", params },
      okResultSchema,
    )
  }

  async mouseUp(x: number, y: number, button?: number, modifiers?: string): Promise<void> {
    const params: { x: number; y: number; button?: number; modifiers?: string } = { x, y }
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
    const params: {
      x: number
      y: number
      deltaX: number
      deltaY: number
      modifiers?: string
    } = { x, y, deltaX, deltaY }
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
      this.#pending.set(request.id, (response) => {
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
      this.#write(encodeSse(request))
    })
  }
}

export async function connectStdio(options: {
  write: (chunk: string) => void
  feed: (listener: (chunk: string) => void) => void
  close?: () => Promise<void>
}): Promise<App> {
  const backend = new SseAutomationBackend(options.write, options.feed, options.close)
  await backend.initialize()
  return new App(backend)
}

export async function launch(options: {
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string | undefined>
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
  })
}
