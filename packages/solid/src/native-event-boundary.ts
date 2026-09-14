import type { EventPayload } from "@gpuix/native"

export type NativeEventFailure = Error | string

export interface NativeEventBoundary {
  handleNativeEvent(
    error: Error | string | null | undefined,
    event: EventPayload | null | undefined,
  ): void
  runTick<T>(tick: () => T): T
}

/**
 * GPUIX can invoke the JS event callback synchronously while macOS `tick()` is
 * still dispatching AppKit input. A Solid handler may immediately commit back
 * into the native renderer, which would try to lease `GpuixView` a second time.
 *
 * Keep normal native events synchronous. Only events that arrive while a native
 * tick is on the stack are queued, then released as soon as that tick returns.
 */
export function createNativeEventBoundary(
  deliver: (event: EventPayload) => void,
  onFailure: (failure: NativeEventFailure) => void,
): NativeEventBoundary {
  const pending: EventPayload[] = []
  let tickDepth = 0

  const deliverSafely = (event: EventPayload): void => {
    try {
      deliver(event)
    } catch (error) {
      onFailure(error instanceof Error ? error : String(error))
    }
  }

  const flush = (): void => {
    while (pending.length > 0) {
      const event = pending.shift()
      if (event) deliverSafely(event)
    }
  }

  return {
    handleNativeEvent(error, event) {
      if (error) {
        onFailure(error)
        return
      }
      if (!event) return
      if (tickDepth > 0) {
        pending.push(event)
        return
      }
      deliverSafely(event)
    },

    runTick<T>(tick: () => T): T {
      tickDepth += 1
      try {
        return tick()
      } finally {
        tickDepth -= 1
        if (tickDepth === 0) flush()
      }
    },
  }
}
