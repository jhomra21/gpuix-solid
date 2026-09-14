type TimerHandle = ReturnType<typeof globalThis.setTimeout>

type ResizeSize = { width: number; height: number }

const RESIZE_POLL_MIN_MS = 16
const RESIZE_POLL_MAX_MS = 128

export function nextDawResizePollDelay(currentDelayMs: number, changed: boolean): number {
  if (changed) return RESIZE_POLL_MIN_MS
  return Math.min(
    RESIZE_POLL_MAX_MS,
    Math.max(RESIZE_POLL_MIN_MS * 2, currentDelayMs * 2),
  )
}

function resizeObserverEntry(target: Element, contentRect: DOMRect): ResizeObserverEntry {
  const size: ResizeObserverSize = {
    inlineSize: contentRect.width,
    blockSize: contentRect.height,
  }
  return {
    target,
    contentRect,
    borderBoxSize: [size],
    contentBoxSize: [size],
    devicePixelContentBoxSize: [size],
  }
}

class AdaptiveResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback
  readonly #targets = new Set<Element>()
  readonly #sizes = new WeakMap<Element, ResizeSize>()
  #timer: TimerHandle | undefined
  #delayMs = RESIZE_POLL_MIN_MS

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element): void {
    this.#targets.add(target)
    this.#delayMs = RESIZE_POLL_MIN_MS
    this.stop()
    this.schedule(0)
  }

  unobserve(target: Element): void {
    this.#targets.delete(target)
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
      if (changed) entries.push(resizeObserverEntry(target, contentRect))
    }

    const changed = entries.length > 0
    this.#delayMs = nextDawResizePollDelay(this.#delayMs, changed)
    if (changed) this.#callback(entries, this)
    this.schedule()
  }
}

export function installDawBrowserScheduler(): void {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: AdaptiveResizeObserver,
  })

  const compatWindow = globalThis.window
  Object.defineProperty(compatWindow, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: AdaptiveResizeObserver,
  })
}

export const dawBrowserSchedulerContract = {
  resizePollMinMs: RESIZE_POLL_MIN_MS,
  resizePollMaxMs: RESIZE_POLL_MAX_MS,
} as const
