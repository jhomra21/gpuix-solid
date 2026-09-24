import { z } from "zod"

type JsonPrimitive = string | number | boolean | null
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

const PROTOCOL_VERSION = 1 as const
const idSchema = z.number().int()
const mouseButtonSchema = z.number().int().optional()
const modifiersSchema = z.string().optional()

const automationRequestSchema = z.discriminatedUnion("method", [
  z.object({
    id: idSchema,
    method: z.literal("initialize"),
    params: z.object({
      protocolVersion: z.literal(PROTOCOL_VERSION),
      client: z.string(),
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("getTree"),
    params: z.object({}),
  }),
  z.object({
    id: idSchema,
    method: z.literal("getBounds"),
    params: z.object({ elementId: z.number() }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("click"),
    params: z.object({
      x: z.number(),
      y: z.number(),
      button: mouseButtonSchema,
      modifiers: modifiersSchema,
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("mouseMove"),
    params: z.object({
      x: z.number(),
      y: z.number(),
      pressedButton: mouseButtonSchema,
      modifiers: modifiersSchema,
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("mouseDown"),
    params: z.object({
      x: z.number(),
      y: z.number(),
      button: mouseButtonSchema,
      modifiers: modifiersSchema,
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("mouseUp"),
    params: z.object({
      x: z.number(),
      y: z.number(),
      button: mouseButtonSchema,
      modifiers: modifiersSchema,
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("scrollWheel"),
    params: z.object({
      x: z.number(),
      y: z.number(),
      deltaX: z.number(),
      deltaY: z.number(),
      modifiers: modifiersSchema,
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("keystrokes"),
    params: z.object({
      elementId: z.number(),
      keys: z.string(),
    }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("screenshot"),
    params: z.object({ path: z.string() }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("clockPause"),
    params: z.object({}),
  }),
  z.object({
    id: idSchema,
    method: z.literal("clockSet"),
    params: z.object({ nowMs: z.number().nonnegative() }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("clockFastForward"),
    params: z.object({ deltaMs: z.number().nonnegative() }),
  }),
  z.object({
    id: idSchema,
    method: z.literal("clockResume"),
    params: z.object({}),
  }),
])

type AutomationRequest = z.infer<typeof automationRequestSchema>

type AutomationResponse =
  | { id: number; result: JsonValue }
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

function encodeSse(response: AutomationResponse): string {
  return `data: ${JSON.stringify(response)}\n\n`
}

function nextNativeInputTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function parseBounds(bounds: number[] | null): { x: number; y: number; width: number; height: number } | null {
  if (bounds === null) return null
  const [x, y, width, height] = bounds
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error("Native element bounds did not contain four coordinates")
  }
  return { x, y, width, height }
}

function parseAutomationTree(json: string): JsonValue {
  return jsonValueSchema.parse(JSON.parse(json))
}

async function dispatch(
  request: AutomationRequest,
  renderer: LiveAutomationRenderer,
): Promise<JsonValue> {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: PROTOCOL_VERSION,
        pid: process.pid,
        capabilities: ["input", "screenshot", "clock", "tree"],
        window: renderer.getWindowSize?.() ?? { width: 800, height: 600 },
      }
    case "getTree":
      return { tree: parseAutomationTree(renderer.getAutomationTree()) }
    case "getBounds":
      return { bounds: parseBounds(renderer.getElementBounds(request.params.elementId)) }
    case "click":
      renderer.simulateMouseDown(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      await nextNativeInputTurn()
      renderer.simulateMouseUp(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return { ok: true }
    case "mouseMove":
      renderer.simulateMouseMove(
        request.params.x,
        request.params.y,
        request.params.pressedButton,
        request.params.modifiers,
      )
      return { ok: true }
    case "mouseDown":
      renderer.simulateMouseDown(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return { ok: true }
    case "mouseUp":
      renderer.simulateMouseUp(
        request.params.x,
        request.params.y,
        request.params.button,
        request.params.modifiers,
      )
      return { ok: true }
    case "scrollWheel":
      renderer.simulateScrollWheel(
        request.params.x,
        request.params.y,
        request.params.deltaX,
        request.params.deltaY,
        request.params.modifiers,
      )
      return { ok: true }
    case "keystrokes":
      renderer.focusElement(request.params.elementId)
      renderer.simulateKeystrokes(request.params.keys)
      return { ok: true }
    case "screenshot":
      renderer.captureScreenshot(request.params.path)
      return { path: request.params.path }
    case "clockPause":
      return { nowMs: renderer.clockPause() }
    case "clockSet":
      return { nowMs: renderer.clockSet(request.params.nowMs) }
    case "clockFastForward":
      return { nowMs: renderer.clockFastForward(request.params.deltaMs) }
    case "clockResume":
      return { nowMs: renderer.clockResume() }
  }
}

async function respond(raw: JsonValue, renderer: LiveAutomationRenderer): Promise<string> {
  const parsed = automationRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return encodeSse({
      id: -1,
      error: {
        code: "Protocol",
        message: `Invalid automation request: ${parsed.error.message}`,
      },
    })
  }

  try {
    return encodeSse({ id: parsed.data.id, result: await dispatch(parsed.data, renderer) })
  } catch (reason) {
    return encodeSse({
      id: parsed.data.id,
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

      const message = jsonValueSchema.safeParse(JSON.parse(data))
      if (!message.success) continue

      void respond(message.data, renderer).then((reply) => {
        process.stdout.write(reply)
      })
    }
  })
}
