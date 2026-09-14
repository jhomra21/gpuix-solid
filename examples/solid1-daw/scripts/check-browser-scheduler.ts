import {
  dawBrowserSchedulerContract,
  nextDawResizePollDelay,
} from "../src/compat/browser-scheduler.ts"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const { resizePollMinMs, resizePollMaxMs } = dawBrowserSchedulerContract
requireCondition(resizePollMinMs === 16, `DAW ResizeObserver must start at 16ms, got ${resizePollMinMs}`)
requireCondition(resizePollMaxMs === 128, `DAW ResizeObserver must cap stable polling at 128ms, got ${resizePollMaxMs}`)

let delay = resizePollMinMs
for (const expected of [32, 64, 128, 128]) {
  delay = nextDawResizePollDelay(delay, false)
  requireCondition(delay === expected, `stable ResizeObserver backoff expected ${expected}ms, got ${delay}`)
}

requireCondition(
  nextDawResizePollDelay(resizePollMaxMs, true) === resizePollMinMs,
  "a detected size change must immediately restore the fast ResizeObserver polling interval",
)

console.log("DAW browser scheduler compatibility: adaptive ResizeObserver backoff passed")
