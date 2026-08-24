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
  simulateClick(x: number, y: number, button?: number): void
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

  click(x: number, y: number): void {
    this.#renderer.simulateClick(x, y)
    this.#renderer.tick()
  }

  keystrokes(_elementId: number, _keys: string): never {
    throw new AutomationError(
      "Unsupported",
      "Live GPUIX does not expose keystroke injection yet",
    )
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
      await backend.click(request.params.x, request.params.y)
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
