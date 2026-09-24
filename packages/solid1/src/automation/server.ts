type JsonObject = Record<string, unknown>

type AutomationRequest = {
  id: number
  method: string
  params: JsonObject
}

type AutomationResponse =
  | { id: number; result: unknown }
  | { id: number; error: { code: "Protocol"; message: string } }

export interface LiveAutomationRenderer {
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
  captureScreenshot(path: string): void
  getAutomationTree(): string
  getElementBounds(elementId: number): number[] | null
  getWindowSize?(): { width: number; height: number }
  clockPause(): number
  clockSet(nowMs: number): number
  clockFastForward(deltaMs: number): number
  clockResume(): number
}

const PROTOCOL_VERSION = 1

function encodeSse(response: AutomationResponse): string {
  return `data: ${JSON.stringify(response)}\n\n`
}

function nextNativeInputTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function numberParam(params: JsonObject, key: string): number {
  const value = params[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric automation parameter ${key}`)
  }
  return value
}

function optionalNumberParam(params: JsonObject, key: string): number | undefined {
  const value = params[key]
  if (value === undefined) return undefined
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric automation parameter ${key}`)
  }
  return value
}

function stringParam(params: JsonObject, key: string): string {
  const value = params[key]
  if (typeof value !== "string") {
    throw new Error(`Expected string automation parameter ${key}`)
  }
  return value
}

function optionalStringParam(params: JsonObject, key: string): string | undefined {
  const value = params[key]
  if (value === undefined) return undefined
  if (typeof value !== "string") {
    throw new Error(`Expected string automation parameter ${key}`)
  }
  return value
}

function parseRequest(value: unknown): AutomationRequest {
  if (!value || typeof value !== "object") throw new Error("Automation request must be an object")
  const record = value as JsonObject
  const id = record.id
  const method = record.method
  const params = record.params
  if (typeof id !== "number" || !Number.isInteger(id)) {
    throw new Error("Automation request id must be an integer")
  }
  if (typeof method !== "string") throw new Error("Automation request method must be a string")
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error("Automation request params must be an object")
  }
  return { id, method, params: params as JsonObject }
}

function parseBounds(bounds: number[] | null): { x: number; y: number; width: number; height: number } | null {
  if (bounds === null) return null
  const [x, y, width, height] = bounds
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error("Native element bounds did not contain four coordinates")
  }
  return { x, y, width, height }
}

async function dispatch(
  request: AutomationRequest,
  renderer: LiveAutomationRenderer,
): Promise<unknown> {
  switch (request.method) {
    case "initialize": {
      const protocolVersion = numberParam(request.params, "protocolVersion")
      if (protocolVersion !== PROTOCOL_VERSION) {
        throw new Error(
          `Unsupported automation protocol ${protocolVersion}; expected ${PROTOCOL_VERSION}`,
        )
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        pid: process.pid,
        capabilities: ["input", "screenshot", "clock", "tree"],
        window: renderer.getWindowSize?.() ?? { width: 800, height: 600 },
      }
    }
    case "getTree":
      return { tree: JSON.parse(renderer.getAutomationTree()) as unknown }
    case "getBounds":
      return { bounds: parseBounds(renderer.getElementBounds(numberParam(request.params, "elementId"))) }
    case "click": {
      const x = numberParam(request.params, "x")
      const y = numberParam(request.params, "y")
      const button = optionalNumberParam(request.params, "button")
      const modifiers = optionalStringParam(request.params, "modifiers")
      renderer.simulateMouseDown(x, y, button, modifiers)
      await nextNativeInputTurn()
      renderer.simulateMouseUp(x, y, button, modifiers)
      return { ok: true }
    }
    case "mouseMove":
      renderer.simulateMouseMove(
        numberParam(request.params, "x"),
        numberParam(request.params, "y"),
        optionalNumberParam(request.params, "pressedButton"),
        optionalStringParam(request.params, "modifiers"),
      )
      return { ok: true }
    case "mouseDown":
      renderer.simulateMouseDown(
        numberParam(request.params, "x"),
        numberParam(request.params, "y"),
        optionalNumberParam(request.params, "button"),
        optionalStringParam(request.params, "modifiers"),
      )
      return { ok: true }
    case "mouseUp":
      renderer.simulateMouseUp(
        numberParam(request.params, "x"),
        numberParam(request.params, "y"),
        optionalNumberParam(request.params, "button"),
        optionalStringParam(request.params, "modifiers"),
      )
      return { ok: true }
    case "scrollWheel":
      renderer.simulateScrollWheel(
        numberParam(request.params, "x"),
        numberParam(request.params, "y"),
        numberParam(request.params, "deltaX"),
        numberParam(request.params, "deltaY"),
        optionalStringParam(request.params, "modifiers"),
      )
      return { ok: true }
    case "keystrokes":
      renderer.focusElement(numberParam(request.params, "elementId"))
      renderer.simulateKeystrokes(stringParam(request.params, "keys"))
      return { ok: true }
    case "screenshot": {
      const path = stringParam(request.params, "path")
      renderer.captureScreenshot(path)
      return { path }
    }
    case "clockPause":
      return { nowMs: renderer.clockPause() }
    case "clockSet":
      return { nowMs: renderer.clockSet(numberParam(request.params, "nowMs")) }
    case "clockFastForward":
      return { nowMs: renderer.clockFastForward(numberParam(request.params, "deltaMs")) }
    case "clockResume":
      return { nowMs: renderer.clockResume() }
    default:
      throw new Error(`Unsupported automation method ${request.method}`)
  }
}

async function respond(raw: unknown, renderer: LiveAutomationRenderer): Promise<string> {
  let id = -1
  try {
    const request = parseRequest(raw)
    id = request.id
    return encodeSse({ id, result: await dispatch(request, renderer) })
  } catch (reason) {
    return encodeSse({
      id,
      error: {
        code: "Protocol",
        message: reason instanceof Error ? reason.message : String(reason),
      },
    })
  }
}

export function enableAutomation(renderer: LiveAutomationRenderer): void {
  let buffer = ""

  process.stdin.setEncoding("utf8")
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk.replaceAll("\r\n", "\n")
    for (;;) {
      const boundary = buffer.indexOf("\n\n")
      if (boundary === -1) break
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
      if (!data) continue

      let message: unknown
      try {
        message = JSON.parse(data) as unknown
      } catch {
        continue
      }

      void respond(message, renderer).then((reply) => {
        process.stdout.write(reply)
      })
    }
  })
}
