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
    // A native TSFN callback can run before the surrounding N-API call has
    // fully unwound. A microtask is still allowed to run at that checkpoint,
    // so use the next event-loop turn before Solid may synchronously flush.
    setImmediate(() => {
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
