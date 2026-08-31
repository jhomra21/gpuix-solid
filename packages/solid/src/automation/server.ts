import {
  AutomationError,
  type AutomationBackend,
  parseAutomationTree,
  parseBounds,
} from "../automation.js"
import { jsonValueSchema, type JsonValue } from "./json.js"
import {
  automationRequestSchema,
  createSseDecoder,
  encodeSse,
  PROTOCOL_VERSION,
  type AutomationRequest,
  type AutomationResponse,
} from "./protocol.js"

export interface LiveAutomationRenderer {
  tick(): boolean
  simulateClick(x: number, y: number, button?: number, modifiers?: string): void
  simulateMouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void
  simulateMouseDown(x: number, y: number, button?: number, modifiers?: string): void
  simulateMouseUp(x: number, y: number, button?: number, modifiers?: string): void
  simulateScrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void
  simulateKeystrokes(keystrokes: string): void
  focusElement(elementId: number): void
  blur(): void
  scrollTo(elementId: number, x: number, y: number): void
  getScrollOffset(elementId: number): number[] | null
  getAllText(): string[]
  getPaintedText(): string[]
  getSelectedText(): string | null
  clearSelection(): void
  captureScreenshot(path: string): void
  getAutomationTree(): string
  getElementBounds(elementId: number): number[] | null
  clockPause(): number
  clockSet(nowMs: number): number
  clockFastForward(deltaMs: number): number
  clockResume(): number
}

export class LiveAutomationBackend implements AutomationBackend {
  readonly #renderer: LiveAutomationRenderer

  constructor(renderer: LiveAutomationRenderer) {
    this.#renderer = renderer
  }

  getTree() {
    return parseAutomationTree(this.#renderer.getAutomationTree())
  }

  getBounds(elementId: number) {
    return parseBounds(this.#renderer.getElementBounds(elementId))
  }

  click(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.simulateClick(x, y, button, modifiers)
    this.#renderer.tick()
  }

  mouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void {
    this.#renderer.simulateMouseMove(x, y, pressedButton, modifiers)
    this.#renderer.tick()
  }

  mouseDown(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.simulateMouseDown(x, y, button, modifiers)
    this.#renderer.tick()
  }

  mouseUp(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.simulateMouseUp(x, y, button, modifiers)
    this.#renderer.tick()
  }

  scrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void {
    this.#renderer.simulateScrollWheel(x, y, deltaX, deltaY, modifiers)
    this.#renderer.tick()
  }

  keystrokes(elementId: number, keys: string): void {
    this.#renderer.focusElement(elementId)
    this.#renderer.simulateKeystrokes(keys)
    this.#renderer.tick()
  }

  screenshot(path: string): void {
    this.#renderer.captureScreenshot(path)
  }

  clockPause(): number {
    return this.#renderer.clockPause()
  }

  clockSet(nowMs: number): number {
    return this.#renderer.clockSet(nowMs)
  }

  clockFastForward(deltaMs: number): number {
    return this.#renderer.clockFastForward(deltaMs)
  }

  clockResume(): number {
    return this.#renderer.clockResume()
  }

  close(): void {}
}

function success(id: number, result: JsonValue): AutomationResponse {
  return { id, result }
}

function failure(id: number, error: AutomationError): AutomationResponse {
  return {
    id,
    error: {
      code: error.code,
      message: error.message,
    },
  }
}

async function dispatch(
  request: AutomationRequest,
  backend: AutomationBackend,
): Promise<AutomationResponse> {
  switch (request.method) {
    case "initialize":
      return success(request.id, {
        protocolVersion: PROTOCOL_VERSION,
        pid: process.pid,
        capabilities: ["input", "screenshot", "clock", "tree"],
        window: { width: 800, height: 600 },
      })
    case "getTree":
      return success(request.id, jsonValueSchema.parse({ tree: await backend.getTree() }))
    case "getBounds":
      return success(request.id, jsonValueSchema.parse({
        bounds: await backend.getBounds(request.params.elementId),
      }))
    case "click":
      await backend.click(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return success(request.id, { ok: true })
    case "mouseMove":
      await backend.mouseMove(
        request.params.x,
        request.params.y,
        request.params.pressedButton,
        request.params.modifiers,
      )
      return success(request.id, { ok: true })
    case "mouseDown":
      await backend.mouseDown(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return success(request.id, { ok: true })
    case "mouseUp":
      await backend.mouseUp(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return success(request.id, { ok: true })
    case "scrollWheel":
      await backend.scrollWheel(
        request.params.x,
        request.params.y,
        request.params.deltaX,
        request.params.deltaY,
        request.params.modifiers,
      )
      return success(request.id, { ok: true })
    case "keystrokes":
      await backend.keystrokes(request.params.elementId, request.params.keys)
      return success(request.id, { ok: true })
    case "screenshot":
      await backend.screenshot(request.params.path)
      return success(request.id, { path: request.params.path })
    case "clockPause":
      return success(request.id, { nowMs: await backend.clockPause() })
    case "clockSet":
      return success(request.id, { nowMs: await backend.clockSet(request.params.nowMs) })
    case "clockFastForward":
      return success(request.id, {
        nowMs: await backend.clockFastForward(request.params.deltaMs),
      })
    case "clockResume":
      return success(request.id, { nowMs: await backend.clockResume() })
  }
}

async function respond(
  request: AutomationRequest,
  backend: AutomationBackend,
): Promise<string> {
  try {
    return encodeSse(await dispatch(request, backend))
  } catch (reason) {
    const error = reason instanceof AutomationError
      ? reason
      : new AutomationError("Protocol", reason instanceof Error ? reason.message : String(reason))
    return encodeSse(failure(request.id, error))
  }
}

export async function handleAutomationRequest(
  raw: JsonValue | AutomationRequest,
  backend: AutomationBackend,
): Promise<string> {
  const parsed = automationRequestSchema.safeParse(raw)
  if (!parsed.success) {
    throw new AutomationError(
      "Protocol",
      `Invalid automation request: ${parsed.error.message}`,
    )
  }
  return await respond(parsed.data, backend)
}

export function serveAutomationStdio(backend: AutomationBackend): void {
  const decoder = createSseDecoder((message) => {
    if (!("method" in message)) return
    void respond(message, backend).then((reply) => {
      process.stdout.write(reply)
    })
  })
  process.stdin.setEncoding("utf8")
  process.stdin.on("data", (chunk: string) => {
    decoder.feed(chunk)
  })
}

export function enableAutomation(renderer: LiveAutomationRenderer): void {
  serveAutomationStdio(new LiveAutomationBackend(renderer))
}
