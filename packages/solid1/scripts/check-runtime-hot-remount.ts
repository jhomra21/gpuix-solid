import { createRoot } from "../src/root.ts"
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

console.log("Solid 1 hot-remount ownership checks passed")
