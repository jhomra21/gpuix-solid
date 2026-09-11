import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  createHostText,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import type { NativeRenderer } from "../src/host/types.js"

type StyleMutation = {
  id: number
  styleJson: string
}

class RecordingRenderer implements NativeRenderer {
  readonly styles: StyleMutation[] = []

  createElement(_id: number, _elementType: string): void {}
  destroyElement(_id: number): number[] { return [] }
  appendChild(_parentId: number, _childId: number): void {}
  removeChild(_parentId: number, _childId: number): void {}
  insertBefore(_parentId: number, _childId: number, _beforeId: number): void {}
  setStyle(id: number, styleJson: string): void { this.styles.push({ id, styleJson }) }
  setText(_id: number, _content: string): void {}
  setEventListener(_id: number, _eventType: string, _hasHandler: boolean): void {}
  setRoot(_id: number): void {}
  commitMutations(): void {}
  setCustomProp(_id: number, _key: string, _valueJson: string): void {}
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function hasTextPointerStyle(
  styles: readonly StyleMutation[],
  textId: number,
  pointerEvents: "auto" | "none" | "cleared",
): boolean {
  return styles.some(({ id, styleJson }) => {
    if (id !== textId) return false
    if (pointerEvents === "cleared") return !styleJson.includes('"pointerEvents"')
    return styleJson.includes(`"pointerEvents":"${pointerEvents}"`)
  })
}

const renderer = new RecordingRenderer()
const events = new EventRegistry()
const driver = new MutationDriver(renderer, events)
const root = new HostRootNode(renderer, events, driver)

const trigger = createHostElement("div", "button")
const decorativeLabel = createHostElement("div", "span")
const text = createHostText("Git Settings")
setHostProperty(trigger, "role", "button")
setHostProperty(decorativeLabel, "style", { pointerEvents: "none" })
insertHostNode(decorativeLabel, text)
insertHostNode(trigger, decorativeLabel)
insertHostNode(root, trigger)
driver.flush()

requireCondition(
  hasTextPointerStyle(renderer.styles, text.id, "none"),
  "raw retained text must inherit pointer-events:none from a decorative ancestor",
)

let checkpoint = renderer.styles.length
setHostProperty(decorativeLabel, "style", { pointerEvents: "auto" })
driver.flush()
requireCondition(
  hasTextPointerStyle(renderer.styles.slice(checkpoint), text.id, "auto"),
  "raw retained text must honor a descendant pointer-events:auto re-enable",
)

checkpoint = renderer.styles.length
setHostProperty(decorativeLabel, "style", {})
driver.flush()
requireCondition(
  hasTextPointerStyle(renderer.styles.slice(checkpoint), text.id, "cleared"),
  "raw retained text must clear a previously materialized pointer-events value",
)

driver.dispose()
console.log("solid1 retained text pointer-events compatibility: passed")
