export interface TickRenderer {
  requiresTick(): boolean
  tick(): boolean
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
    const elapsed = performance.now() - started
    if (elapsed > 20) console.error(`[gpuix-solid][perf] native tick ${elapsed.toFixed(2)}ms`)
    const wait = Math.max(0, frameMs - elapsed)
    timer = setTimeout(tick, wait)
  }

  tick()
  return { stop }
}
