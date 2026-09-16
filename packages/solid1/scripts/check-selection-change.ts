import { createRoot } from "../src/root.ts"
import type { NativeRenderer } from "../src/host/types.ts"
import { createElement } from "../src/universal.ts"

class SelectionFakeRenderer implements NativeRenderer {
  readonly subscriptions: Array<[boolean, number]> = []
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
  setWindowSelectionChange(enabled: boolean, eventId: number): void {
    this.subscriptions.push([enabled, eventId])
  }
}

const renderer = new SelectionFakeRenderer()
const values: Array<string | null> = []
const root = createRoot(renderer, { onSelectionChange: (event) => values.push(event.value ?? null) })
const first = createElement("div")
if (first.kind !== "element") throw new Error("Expected Solid 1 host element")
root.render(() => first)
const firstId = renderer.subscriptions.at(-1)?.[1]
if (firstId === undefined) throw new Error("Expected Solid 1 selection subscription")

const second = createElement("div")
if (second.kind !== "element") throw new Error("Expected remounted Solid 1 host element")
root.render(() => second)
const secondId = renderer.subscriptions.at(-1)?.[1]
if (secondId === undefined || secondId <= firstId) throw new Error("Solid 1 selection lease did not rotate")
if (root.dispatch({ elementId: firstId, eventType: "selectionChange", value: "stale" })) {
  throw new Error("Solid 1 accepted a stale selection event")
}
if (!root.dispatch({ elementId: secondId, eventType: "selectionChange", value: "solid1" })) {
  throw new Error("Solid 1 rejected the current selection event")
}
if (values.join(",") !== "solid1") throw new Error("Unexpected Solid 1 selection values: " + values.join(","))
root.unmount()
const final = renderer.subscriptions.at(-1)
if (!final || final[0] !== false || final[1] !== secondId) throw new Error("Solid 1 did not disable selection events on unmount")

console.log("Solid 1 selection-change contract passed")
