import type { NativeRenderer } from "../src/host/types.js"

export class FakeRenderer implements NativeRenderer {
  readonly batches: unknown[][][] = []
  readonly direct: unknown[][] = []
  destroyed: number[] = []

  applyBatch(json: string): number[] {
    this.batches.push(JSON.parse(json) as unknown[][])
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
}
