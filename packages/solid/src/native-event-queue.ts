import type { EventPayload } from "@gpuix/native"

export type NativeEventFailure = Error | string

export function createDeferredNativeEventHandler(
  deliver: (event: EventPayload) => void,
  onFailure: (failure: NativeEventFailure) => void,
): (
  error: Error | string | null | undefined,
  event: EventPayload | null | undefined,
) => void {
  const pending: EventPayload[] = []
  let scheduled = false

  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      try {
        while (pending.length > 0) {
          const event = pending.shift()
          if (!event) continue
          try {
            deliver(event)
          } catch (error) {
            onFailure(error instanceof Error ? error : String(error))
          }
        }
      } finally {
        scheduled = false
        if (pending.length > 0) schedule()
      }
    })
  }

  return (error, event) => {
    if (error) {
      onFailure(error)
      return
    }
    if (!event) return
    pending.push(event)
    schedule()
  }
}
