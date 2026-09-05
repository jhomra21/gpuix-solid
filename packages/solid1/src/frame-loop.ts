export interface TickRenderer {
  requiresTick(): boolean
  tick(): boolean
}

export interface FrameLoop {
  stop(): void
}

const DEFAULT_FRAME_MS = 8

export function startFrameLoop(
  renderer: TickRenderer,
  options: { frameMs?: number; onTerminated?: () => void } = {},
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
      console.error("[gpuix-solid] tick error", error)
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
