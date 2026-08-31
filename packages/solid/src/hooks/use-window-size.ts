import { createSignal, onCleanup, onSettled } from "solid-js"
import { useGpuix } from "../context.js"
import type {
  EdgeInsets,
  NativeRenderer,
  NativeWindowInsets,
} from "../host/types.js"

export interface WindowSize {
  width: number
  height: number
}

export interface WindowSizeOptions {
  /** Poll interval in milliseconds. Defaults to 100. Set false for one read. */
  intervalMs?: number | false
}

const DEFAULT_WINDOW_SIZE: WindowSize = { width: 800, height: 600 }

function readWindowSize(renderer: NativeRenderer | null): WindowSize {
  try {
    const size = renderer?.getWindowSize?.()
    if (size && size.width > 0 && size.height > 0) {
      return { width: size.width, height: size.height }
    }
  } catch {
    // The renderer can exist before its native window is ready.
  }
  return DEFAULT_WINDOW_SIZE
}

/**
 * The current GPUI window size, sampled every 100ms by default.
 *
 * The first read can happen before a platform window has a usable size, and a
 * one-shot fallback would leave coordinate-driven UIs permanently stale after
 * resize. Polling mirrors the published GPUIX 0.6 React contract.
 */
export function useWindowSize(options: WindowSizeOptions = {}): WindowSize {
  const renderer = useGpuix()?.renderer ?? null
  const [size, setSize] = createSignal(readWindowSize(renderer))
  let timer: ReturnType<typeof setInterval> | undefined

  const update = (): void => {
    const next = readWindowSize(renderer)
    setSize((current) =>
      current.width === next.width && current.height === next.height
        ? current
        : next,
    )
  }

  onSettled(() => {
    update()
    const intervalMs = options.intervalMs ?? 100
    if (intervalMs !== false) {
      timer = setInterval(update, Math.max(16, intervalMs))
    }
  })

  onCleanup(() => {
    if (timer !== undefined) clearInterval(timer)
  })

  return {
    get width() {
      return size().width
    },
    get height() {
      return size().height
    },
  }
}

export interface WindowInsets extends NativeWindowInsets {
  /** Y coordinate where unobscured content ends. Equals window height when closed. */
  keyboardTop: number
  keyboardVisible: boolean
  visibleHeight: number
}

export interface WindowInsetsOptions {
  /** Poll interval in milliseconds. Defaults to 100. Set false for one read. */
  intervalMs?: number | false
}

const ZERO_EDGES: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 }
const ZERO_WINDOW_INSETS: NativeWindowInsets = {
  safeArea: ZERO_EDGES,
  ime: ZERO_EDGES,
  effective: ZERO_EDGES,
}

function readWindowInsets(renderer: NativeRenderer | null): WindowInsets {
  const size = readWindowSize(renderer)
  let insets = ZERO_WINDOW_INSETS
  try {
    insets = renderer?.getWindowInsets?.() ?? insets
  } catch {
    // The renderer can exist before its native window is ready.
  }
  return {
    safeArea: insets.safeArea,
    ime: insets.ime,
    effective: insets.effective,
    keyboardTop: size.height - insets.ime.bottom,
    keyboardVisible: insets.ime.bottom > 0,
    visibleHeight: size.height - insets.effective.top - insets.effective.bottom,
  }
}

function sameEdges(left: EdgeInsets, right: EdgeInsets): boolean {
  return (
    left.top === right.top &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.left === right.left
  )
}

function sameWindowInsets(left: WindowInsets, right: WindowInsets): boolean {
  return (
    left.keyboardTop === right.keyboardTop &&
    left.keyboardVisible === right.keyboardVisible &&
    left.visibleHeight === right.visibleHeight &&
    sameEdges(left.safeArea, right.safeArea) &&
    sameEdges(left.ime, right.ime) &&
    sameEdges(left.effective, right.effective)
  )
}

/** Get safe-area and keyboard geometry, sampled every 100ms by default. */
export function useWindowInsets(options: WindowInsetsOptions = {}): WindowInsets {
  const renderer = useGpuix()?.renderer ?? null
  const [insets, setInsets] = createSignal(readWindowInsets(renderer))
  let timer: ReturnType<typeof setInterval> | undefined

  const update = (): void => {
    const next = readWindowInsets(renderer)
    setInsets((current) => sameWindowInsets(current, next) ? current : next)
  }

  onSettled(() => {
    update()
    const intervalMs = options.intervalMs ?? 100
    if (intervalMs !== false) {
      timer = setInterval(update, Math.max(16, intervalMs))
    }
  })

  onCleanup(() => {
    if (timer !== undefined) clearInterval(timer)
  })

  return {
    get safeArea() {
      return insets().safeArea
    },
    get ime() {
      return insets().ime
    },
    get effective() {
      return insets().effective
    },
    get keyboardTop() {
      return insets().keyboardTop
    },
    get keyboardVisible() {
      return insets().keyboardVisible
    },
    get visibleHeight() {
      return insets().visibleHeight
    },
  }
}
