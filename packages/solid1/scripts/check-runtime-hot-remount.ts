import { createRoot } from "../src/root.ts"
import { render, resetRender } from "../src/runtime.ts"
import { createElement, setProp } from "../src/universal.ts"
import type { NativeRenderer } from "../src/host/types.ts"

type MutationValue = string | number | boolean | object | null

class RuntimeFakeRenderer implements NativeRenderer {
  readonly batches: MutationValue[][][] = []
  readonly windowKeyEvents: Array<[boolean, boolean, number]> = []

  applyBatch(json: string): number[] {
    // SAFETY: MutationDriver serializes only renderer mutation tuples.
    this.batches.push(JSON.parse(json) as MutationValue[][])
    return []
  }
  createElement(): void {}
  destroyElement(): number[] { return [] }
  appendChild(): void {}
  removeChild(): void {}
  insertBefore(): void {}
  setStyle(): void {}
  setText(): void {}
  setEventListener(): void {}
  setRoot(): void {}
  commitMutations(): void {}
  setCustomProp(): void {}
  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {
    this.windowKeyEvents.push([keyDown, keyUp, eventId])
  }
}

function testIdElementId(renderer: RuntimeFakeRenderer, testId: string): number | undefined {
  for (const batch of renderer.batches) {
    for (const mutation of batch) {
      if (mutation[0] !== "setCustomProp" || mutation[2] !== "testId" || mutation[3] !== testId) continue
      const id = Number(mutation[1])
      if (Number.isInteger(id)) return id
    }
  }
  return undefined
}

const renderer = new RuntimeFakeRenderer()
const received: string[] = []
const root = createRoot(renderer, { onKeyDown: () => received.push("first") })
const first = createElement("div")
if (first.kind !== "element") throw new Error("Expected first Solid 1 host element")
setProp(first, "onClick", () => received.push("first-click"), undefined)
root.render(() => first)
const firstWindowEventId = renderer.windowKeyEvents.at(-1)?.[2]
if (firstWindowEventId === undefined) throw new Error("Expected initial Solid 1 window event id")
if (!root.dispatch({ elementId: first.id, eventType: "click" })) throw new Error("Live Solid 1 element event must be accepted")

root.setWindowKeyEventHandlers({ onKeyDown: () => received.push("second") })
const second = createElement("div")
if (second.kind !== "element") throw new Error("Expected second Solid 1 host element")
root.render(() => second)
const secondWindowEventId = renderer.windowKeyEvents.at(-1)?.[2]
if (secondWindowEventId === undefined || secondWindowEventId <= firstWindowEventId) {
  throw new Error(`Solid 1 remount must rotate the window event id: ${firstWindowEventId}/${String(secondWindowEventId)}`)
}
if (second.id <= first.id) throw new Error(`Solid 1 remount must keep renderer ids monotonic: ${first.id}/${second.id}`)
if (root.dispatch({ elementId: first.id, eventType: "click" })) throw new Error("Replaced Solid 1 element event must be rejected")
if (root.dispatch({ elementId: firstWindowEventId, eventType: "windowKeyDown", key: "a" })) {
  throw new Error("Queued Solid 1 window event from the previous root must be rejected")
}
if (!root.dispatch({ elementId: secondWindowEventId, eventType: "windowKeyDown", key: "a" })) {
  throw new Error("Current Solid 1 window event must be accepted")
}
if (received.join(",") !== "first-click,second") {
  throw new Error(`Solid 1 remount routed unexpected events: ${received.join(",")}`)
}
root.unmount()

const runtimeRenderer = new RuntimeFakeRenderer()
let runtimeAttempts = 0
const runtimeHandle = render(() => {
  runtimeAttempts += 1
  if (runtimeAttempts === 1) throw new Error("Solid 1 runtime overlay detector")
  const node = createElement("div")
  if (node.kind !== "element") throw new Error("Expected reloaded Solid 1 host element")
  setProp(node, "testId", "reloaded-app", undefined)
  return node
}, { renderer: runtimeRenderer })

await Promise.resolve()
const overlayId = testIdElementId(runtimeRenderer, "runtime-error-overlay")
if (overlayId === undefined) throw new Error("Solid 1 runtime throw must mount an error overlay")
const reloadId = testIdElementId(runtimeRenderer, "runtime-error-reload")
if (reloadId === undefined) throw new Error("Solid 1 runtime error overlay must expose Reload")
if (!runtimeHandle.root.dispatch({ elementId: reloadId, eventType: "click" })) {
  throw new Error("Solid 1 runtime Reload must dispatch through the live root")
}
if (runtimeAttempts !== 2) throw new Error(`Solid 1 Reload must retry the app closure: ${runtimeAttempts}`)
if (testIdElementId(runtimeRenderer, "reloaded-app") === undefined) {
  throw new Error("Solid 1 Reload must remount the original app closure")
}
resetRender()

console.log("Solid 1 hot-remount and runtime-error recovery checks passed")
