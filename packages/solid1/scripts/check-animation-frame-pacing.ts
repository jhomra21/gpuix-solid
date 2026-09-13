import {
  COMPAT_ANIMATION_FRAME_MS,
  createAnimationFrameScheduler,
} from "../src/animation-frame.js"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

let scheduledDelay = -1
let scheduledCallback: (() => void) | undefined
let cancelledHandle: ReturnType<typeof globalThis.setTimeout> | undefined
// SAFETY: the scheduler treats timer handles as opaque values; this sentinel is only compared by identity and is never passed to a real timer API.
const fakeHandle = {} as ReturnType<typeof globalThis.setTimeout>

const scheduler = createAnimationFrameScheduler(
  (callback, delay) => {
    scheduledCallback = callback
    scheduledDelay = delay
    return fakeHandle
  },
  (handle) => {
    cancelledHandle = handle
  },
  () => 123.5,
)

let callbackTimestamp = -1
const handle = scheduler.request((timestamp) => {
  callbackTimestamp = timestamp
})

requireCondition(handle === fakeHandle, "RAF compatibility must return the underlying cancellable timer handle")
requireCondition(
  scheduledDelay === COMPAT_ANIMATION_FRAME_MS,
  `RAF compatibility must pace callbacks at ${COMPAT_ANIMATION_FRAME_MS}ms, got ${scheduledDelay}`,
)
requireCondition(scheduledCallback !== undefined, "RAF compatibility must schedule the requested callback")
scheduledCallback?.()
requireCondition(callbackTimestamp === 123.5, `RAF compatibility must pass the scheduler timestamp, got ${callbackTimestamp}`)

scheduler.cancel(handle)
requireCondition(cancelledHandle === fakeHandle, "RAF compatibility cancellation must clear the scheduled timer")

console.log("solid1 requestAnimationFrame pacing: passed")
