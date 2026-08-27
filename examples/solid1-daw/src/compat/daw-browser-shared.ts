export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message)
  return value
}

export type AutomationEnvelope = {
  points?: Array<{ timeSec: number; value: number }>
}

export type AutomationParameterSelection = {
  parameterId: string
  effectInstanceId?: string
}
