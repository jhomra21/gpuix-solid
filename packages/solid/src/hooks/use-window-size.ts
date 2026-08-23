import { createSignal, onSettled } from "solid-js"
import { useGpuix } from "../context.js"

export interface WindowSize {
  width: number
  height: number
}

const DEFAULT_WINDOW_SIZE: WindowSize = { width: 800, height: 600 }

/** Read the current GPUI window size from the active renderer. */
export function useWindowSize(): WindowSize {
  const context = useGpuix()
  const [size, setSize] = createSignal<WindowSize>(DEFAULT_WINDOW_SIZE)

  onSettled(() => {
    try {
      const next = context?.renderer.getWindowSize?.()
      if (next) setSize({ width: next.width, height: next.height })
    } catch {
      // The renderer can exist before its native window is ready.
    }
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
