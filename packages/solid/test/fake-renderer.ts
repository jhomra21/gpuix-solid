import type { MutationValue } from "../src/host/mutations.js"
import type { NativeRenderer } from "../src/host/types.js"

export class FakeRenderer implements NativeRenderer {
  readonly batches: MutationValue[][][] = []
  readonly direct: MutationValue[][] = []
  destroyed: number[] = []
  readonly windowKeyEvents: Array<[boolean, boolean, number]> = []
  focusNextCount = 0
  focusPreviousCount = 0

  applyBatch(json: string): number[] {
    // SAFETY: MutationDriver serializes batches containing only MutationValue entries.
    this.batches.push(JSON.parse(json) as MutationValue[][])
    const destroyed = this.destroyed
    this.destroyed = []
    return destroyed
  }

  createElement(id: number, type: string): void { this.direct.push(["createElement", id, type]) }
  destroyElement(id: number): number[] { this.direct.push(["destroyElement", id]); return [id] }
  appendChild(parent: number, child: number): void { this.direct.push(["appendChild", parent, child]) }
  removeChild(parent: number, child: number): void { this.direct.push(["removeChild", parent, child]) }
  insertBefore(parent: number, child: number, before: number): void { this.direct.push(["insertBefore", parent, child, before]) }
  setStyle(id: number, style: string): void { this.direct.push(["setStyle", id, style]) }
  setText(id: number, content: string): void { this.direct.push(["setText", id, content]) }
  setEventListener(id: number, type: string, enabled: boolean): void { this.direct.push(["setEventListener", id, type, enabled]) }
  setRoot(id: number): void { this.direct.push(["setRoot", id]) }
  setCustomProp(id: number, key: string, value: string): void { this.direct.push(["setCustomProp", id, key, value]) }
  commitMutations(): void { this.direct.push(["commitMutations"]) }
  focusNext(): void { this.focusNextCount++ }
  focusPrevious(): void { this.focusPreviousCount++ }
  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {
    this.windowKeyEvents.push([keyDown, keyUp, eventId])
  }
}
