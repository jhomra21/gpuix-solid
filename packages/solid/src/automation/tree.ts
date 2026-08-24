import { z } from "zod"
import { jsonValueSchema, type JsonValue } from "./json.js"

export interface ElementBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface AutomationTreeNode {
  id: number
  type: string
  text?: string
  testId?: string
  style?: Record<string, JsonValue>
  events?: string[]
  customProps?: Record<string, JsonValue>
  bounds?: ElementBounds
  children?: AutomationTreeNode[]
}

const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

export const automationTreeNodeSchema: z.ZodType<AutomationTreeNode> = z.lazy(() =>
  z.object({
    id: z.number(),
    type: z.string(),
    text: z.string().optional(),
    testId: z.string().optional(),
    style: z.record(z.string(), jsonValueSchema).optional(),
    events: z.array(z.string()).optional(),
    customProps: z.record(z.string(), jsonValueSchema).optional(),
    bounds: boundsSchema.optional(),
    children: z.array(automationTreeNodeSchema).optional(),
  }),
)

export function parseAutomationTreeValue(value: JsonValue): AutomationTreeNode | null {
  if (value === null) return null
  return automationTreeNodeSchema.parse(value)
}
