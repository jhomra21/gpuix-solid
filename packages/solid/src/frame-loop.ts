export interface TickRenderer {
  requiresTick(): boolean
  tick(): boolean
}

export interface FrameLoop {
  stop(): void
}

export type FrameLoopError = Error | string

const DEFAULT_FRAME_MS = 8
let automationOwnsFramePump = false

export function setAutomationFrameOwnership(owned: boolean): void {
  automationOwnsFramePump = owned
}

export function startFrameLoop(
  renderer: TickRenderer,
  options: { frameMs?: number; onTerminated?: () => void; onError?: (error: FrameLoopError) => void } = {},
): FrameLoop {
  if (automationOwnsFramePump || !renderer.requiresTick()) return { stop() {} }

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
    const wait = Math.max(0, frameMs - (performance.now() - started))
    timer = setTimeout(tick, wait)
  }

  tick()
  return { stop }
}
