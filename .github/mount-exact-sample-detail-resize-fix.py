from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "packages/solid1/src/dom-environment.ts"
text = path.read_text()

old = '''class CompatResizeObserver {
  readonly #callback: CompatResizeObserverCallback
  readonly #targets = new Set<HostElementNode>()

  constructor(callback: CompatResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: HostElementNode): void {
    this.#targets.add(target)
    this.#callback([{ target, contentRect: target.getBoundingClientRect() }])
  }

  unobserve(target: HostElementNode): void {
    this.#targets.delete(target)
  }

  disconnect(): void {
    this.#targets.clear()
  }
}
'''

new = '''class CompatResizeObserver {
  readonly #callback: CompatResizeObserverCallback
  readonly #targets = new Set<HostElementNode>()
  readonly #bounds = new Map<HostElementNode, CompatRect>()
  #timer: ReturnType<typeof globalThis.setTimeout> | undefined

  constructor(callback: CompatResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: HostElementNode): void {
    this.#targets.add(target)
    this.schedule()
  }

  unobserve(target: HostElementNode): void {
    this.#targets.delete(target)
    this.#bounds.delete(target)
    if (this.#targets.size === 0) this.stop()
  }

  disconnect(): void {
    this.#targets.clear()
    this.#bounds.clear()
    this.stop()
  }

  private schedule(): void {
    if (this.#timer !== undefined || this.#targets.size === 0) return
    this.#timer = globalThis.setTimeout(() => this.check(), 16)
  }

  private stop(): void {
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer)
    this.#timer = undefined
  }

  private check(): void {
    this.#timer = undefined
    const entries: CompatResizeObserverEntry[] = []
    for (const target of this.#targets) {
      const contentRect = target.getBoundingClientRect()
      const previous = this.#bounds.get(target)
      if (!previous || !sameSize(previous, contentRect)) entries.push({ target, contentRect })
      this.#bounds.set(target, contentRect)
    }
    if (entries.length > 0) this.#callback(entries)
    this.schedule()
  }
}

function sameSize(left: CompatRect, right: CompatRect): boolean {
  return left.width === right.width && left.height === right.height
}
'''

if old not in text:
    raise SystemExit("one-shot ResizeObserver anchor missing")
path.write_text(text.replace(old, new, 1))
