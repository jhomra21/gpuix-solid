type AnimationFrameHandle = ReturnType<typeof globalThis.setTimeout>
type AnimationFrameCallback = (time: number) => void
type SetTimer = (callback: () => void, delay: number) => AnimationFrameHandle
type ClearTimer = (handle: AnimationFrameHandle) => void
type Now = () => number

// Native GPUIX does not expose a browser display-vsync callback. Match the
// native 8 ms pump instead of capping browser-shaped requestAnimationFrame()
// loops at 60 Hz. A zero-delay timer would spin independently of native paint.
export const COMPAT_ANIMATION_FRAME_MS = 8

export function createAnimationFrameScheduler(
  setTimer: SetTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer: ClearTimer = (handle) => globalThis.clearTimeout(handle),
  now: Now = () => globalThis.performance.now(),
) {
  return {
    request(callback: AnimationFrameCallback): AnimationFrameHandle {
      return setTimer(() => callback(now()), COMPAT_ANIMATION_FRAME_MS)
    },
    cancel(handle: AnimationFrameHandle): void {
      clearTimer(handle)
    },
  }
}

export function installPacedAnimationFrame(): void {
  const scheduler = createAnimationFrameScheduler()
  const request = (callback: AnimationFrameCallback): AnimationFrameHandle => scheduler.request(callback)
  const cancel = (handle: AnimationFrameHandle): void => scheduler.cancel(handle)

  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: request,
  })
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: cancel,
  })

  // dom-environment is imported before this installer and establishes the native window compatibility object.
  const compatWindow = globalThis.window
  Object.defineProperty(compatWindow, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: request,
  })
  Object.defineProperty(compatWindow, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: cancel,
  })
}
