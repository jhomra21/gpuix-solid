export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export function parseJson(text: string): JsonValue {
  return JSON.parse(text) as JsonValue
}
