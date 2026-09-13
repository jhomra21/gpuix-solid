export interface TickRenderer {
  requiresTick(): boolean
  tick(): boolean
  applyBatch?(json: string): number[]
}

export interface FrameLoop {
  stop(): void
}

export type FrameLoopError = Error | string

const DEFAULT_FRAME_MS = 8

export function startFrameLoop(
  renderer: TickRenderer,
  options: { frameMs?: number; onTerminated?: () => void; onError?: (error: FrameLoopError) => void } = {},
): FrameLoop {
  if (!renderer.requiresTick()) return { stop() {} }

  const frameMs = options.frameMs ?? DEFAULT_FRAME_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let firstTickPending = true

  const stop = (): void => {
    stopped = true
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  const tick = (): void => {
    if (stopped) return
    const started = performance.now()
    let running = true
    try {
      running = renderer.tick()
      if (running && firstTickPending) {
        firstTickPending = false
        // GPUIX macOS creates and paints the native window before Solid's first
        // retained batch exists. An invalidation queued before the first AppKit
        // pump can therefore leave that empty startup frame on screen. Once the
        // first pump has completed, an empty batch preserves retained state while
        // requesting one fresh frame through GPUIX's normal invalidation path.
        if (process.platform === "darwin") renderer.applyBatch?.("[]")
      }
    } catch (error) {
      const failure = error instanceof Error ? error : String(error)
      if (options.onError) options.onError(failure)
      else console.error("[gpuix-solid] tick error", failure)
    }
    if (!running) {
      stop()
      options.onTerminated?.()
      return
    }
    const wait = Math.max(0, frameMs - (performance.now() - started))
    timer = setTimeout(tick, wait)
  }

  tick()
  return { stop }
}
