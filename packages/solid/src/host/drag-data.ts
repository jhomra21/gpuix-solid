import { z } from "zod"
import type { DragData } from "./types.js"

export const dragDataSchema: z.ZodType<DragData> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(dragDataSchema),
    z.record(z.string(), dragDataSchema),
  ]),
)

export function parseDragData<T>(value: T): DragData | undefined {
  if (value === undefined) return undefined
  return dragDataSchema.parse(value)
}
