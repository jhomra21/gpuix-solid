import { createParser, type EventSourceMessage } from "eventsource-parser"
import { z } from "zod"
import type { AutomationErrorCode } from "../automation.js"
import { jsonValueSchema, parseJson, type JsonValue } from "./json.js"

export const PROTOCOL_VERSION = 1 as const

export const automationErrorCodes = [
  "Timeout",
  "NotFound",
  "Ambiguous",
  "Protocol",
  "Closed",
  "Unsupported",
  "Security",
  "Cancelled",
] as const satisfies readonly AutomationErrorCode[]

const errorCodeSchema = z.enum(automationErrorCodes)
const idSchema = z.number().int()
const mouseButtonSchema = z.number().int().optional()
const modifiersSchema = z.string().optional()

const initializeRequestSchema = z.object({
  id: idSchema,
  method: z.literal("initialize"),
  params: z.object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    client: z.string(),
  }),
})
const getTreeRequestSchema = z.object({
  id: idSchema,
  method: z.literal("getTree"),
  params: z.object({}),
})
const getBoundsRequestSchema = z.object({
  id: idSchema,
  method: z.literal("getBounds"),
  params: z.object({ elementId: z.number() }),
})
const clickRequestSchema = z.object({
  id: idSchema,
  method: z.literal("click"),
  params: z.object({
    x: z.number(),
    y: z.number(),
    button: mouseButtonSchema,
    modifiers: modifiersSchema,
  }),
})
const mouseMoveRequestSchema = z.object({
  id: idSchema,
  method: z.literal("mouseMove"),
  params: z.object({
    x: z.number(),
    y: z.number(),
    pressedButton: mouseButtonSchema,
    modifiers: modifiersSchema,
  }),
})
const mouseDownRequestSchema = z.object({
  id: idSchema,
  method: z.literal("mouseDown"),
  params: z.object({
    x: z.number(),
    y: z.number(),
    button: mouseButtonSchema,
    modifiers: modifiersSchema,
  }),
})
const mouseUpRequestSchema = z.object({
  id: idSchema,
  method: z.literal("mouseUp"),
  params: z.object({
    x: z.number(),
    y: z.number(),
    button: mouseButtonSchema,
    modifiers: modifiersSchema,
  }),
})
const scrollWheelRequestSchema = z.object({
  id: idSchema,
  method: z.literal("scrollWheel"),
  params: z.object({
    x: z.number(),
    y: z.number(),
    deltaX: z.number(),
    deltaY: z.number(),
    modifiers: modifiersSchema,
  }),
})
const keystrokesRequestSchema = z.object({
  id: idSchema,
  method: z.literal("keystrokes"),
  params: z.object({ elementId: z.number(), keys: z.string() }),
})
const screenshotRequestSchema = z.object({
  id: idSchema,
  method: z.literal("screenshot"),
  params: z.object({ path: z.string() }),
})
const clockPauseRequestSchema = z.object({
  id: idSchema,
  method: z.literal("clockPause"),
  params: z.object({}),
})
const clockSetRequestSchema = z.object({
  id: idSchema,
  method: z.literal("clockSet"),
  params: z.object({ nowMs: z.number().nonnegative() }),
})
const clockFastForwardRequestSchema = z.object({
  id: idSchema,
  method: z.literal("clockFastForward"),
  params: z.object({ deltaMs: z.number().nonnegative() }),
})
const clockResumeRequestSchema = z.object({
  id: idSchema,
  method: z.literal("clockResume"),
  params: z.object({}),
})

export const automationRequestSchema = z.discriminatedUnion("method", [
  initializeRequestSchema,
  getTreeRequestSchema,
  getBoundsRequestSchema,
  clickRequestSchema,
  mouseMoveRequestSchema,
  mouseDownRequestSchema,
  mouseUpRequestSchema,
  scrollWheelRequestSchema,
  keystrokesRequestSchema,
  screenshotRequestSchema,
  clockPauseRequestSchema,
  clockSetRequestSchema,
  clockFastForwardRequestSchema,
  clockResumeRequestSchema,
])

export type AutomationRequest = z.infer<typeof automationRequestSchema>
export type AutomationMethod = AutomationRequest["method"]

export const initializeResultSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  pid: z.number().int(),
  capabilities: z.array(z.enum(["input", "screenshot", "clock", "tree"])),
  window: z.object({ width: z.number(), height: z.number() }),
})
export const getTreeResultSchema = z.object({ tree: jsonValueSchema.nullable() })
export const getBoundsResultSchema = z.object({
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).nullable(),
})
export const okResultSchema = z.object({ ok: z.literal(true) })
export const screenshotResultSchema = z.object({ path: z.string() })
export const clockResultSchema = z.object({ nowMs: z.number() })

const responseSchema = z.union([
  z.object({ id: idSchema, result: jsonValueSchema }),
  z.object({
    id: idSchema,
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      data: jsonValueSchema.optional(),
    }),
  }),
])

export type AutomationResponse = z.infer<typeof responseSchema>
export type WireMessage = AutomationRequest | AutomationResponse

export function parseWireMessage(value: JsonValue): WireMessage {
  const request = automationRequestSchema.safeParse(value)
  if (request.success) return request.data
  const response = responseSchema.safeParse(value)
  if (response.success) return response.data
  throw new Error("Invalid GPUIX automation wire message")
}

export function encodeSse(message: WireMessage): string {
  return `data: ${JSON.stringify(message)}\n\n`
}

export interface SseDecoder {
  feed(chunk: string): void
}

export function createSseDecoder(
  onMessage: (message: WireMessage) => void,
  onInvalid?: (raw: string, error: Error) => void,
): SseDecoder {
  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      try {
        onMessage(parseWireMessage(parseJson(event.data)))
      } catch (reason) {
        const error = reason instanceof Error ? reason : new Error(String(reason))
        onInvalid?.(event.data, error)
      }
    },
  })
  return {
    feed(chunk) {
      parser.feed(chunk)
    },
  }
}
