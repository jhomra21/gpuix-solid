type RafCallback = (time: number) => void

type TimerHandle = ReturnType<typeof globalThis.setTimeout>

type ResizeTarget = Element & {
  getBoundingClientRect(): DOMRect
}

const FRAME_INTERVAL_MS = 16
const RESIZE_POLL_MIN_MS = 16
const RESIZE_POLL_MAX_MS = 128

function requestFrame(callback: RafCallback): TimerHandle {
  return globalThis.setTimeout(() => callback(performance.now()), FRAME_INTERVAL_MS)
}

function cancelFrame(handle: TimerHandle): void {
  globalThis.clearTimeout(handle)
}

class AdaptiveResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback
  readonly #targets = new Set<ResizeTarget>()
  readonly #sizes = new WeakMap<ResizeTarget, { width: number; height: number }>()
  #timer: TimerHandle | undefined
  #delayMs = RESIZE_POLL_MIN_MS

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element): void {
    this.#targets.add(target as ResizeTarget)
    this.#delayMs = RESIZE_POLL_MIN_MS
    this.schedule(0)
  }

  unobserve(target: Element): void {
    this.#targets.delete(target as ResizeTarget)
    if (this.#targets.size === 0) this.stop()
  }

  disconnect(): void {
    this.#targets.clear()
    this.stop()
  }

  private schedule(delayMs = this.#delayMs): void {
    if (this.#timer !== undefined || this.#targets.size === 0) return
    this.#timer = globalThis.setTimeout(() => this.check(), delayMs)
  }

  private stop(): void {
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer)
    this.#timer = undefined
  }

  private check(): void {
    this.#timer = undefined
    const entries: ResizeObserverEntry[] = []

    for (const target of this.#targets) {
      const contentRect = target.getBoundingClientRect()
      const previous = this.#sizes.get(target)
      const changed = !previous || previous.width !== contentRect.width || previous.height !== contentRect.height
      this.#sizes.set(target, { width: contentRect.width, height: contentRect.height })
      if (!changed) continue
      entries.push({ target, contentRect } as ResizeObserverEntry)
    }

    if (entries.length > 0) {
      this.#delayMs = RESIZE_POLL_MIN_MS
      this.#callback(entries, this)
    } else {
      this.#delayMs = Math.min(RESIZE_POLL_MAX_MS, Math.max(RESIZE_POLL_MIN_MS * 2, this.#delayMs * 2))
    }
    this.schedule()
  }
}

export function installDawBrowserScheduler(): void {
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: requestFrame,
  })
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: cancelFrame,
  })
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: AdaptiveResizeObserver,
  })

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: requestFrame,
    })
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: cancelFrame,
    })
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: AdaptiveResizeObserver,
    })
  }
}

export const dawBrowserSchedulerContract = {
  frameIntervalMs: FRAME_INTERVAL_MS,
  resizePollMinMs: RESIZE_POLL_MIN_MS,
  resizePollMaxMs: RESIZE_POLL_MAX_MS,
} as const
