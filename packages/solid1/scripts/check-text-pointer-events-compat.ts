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

function textStyleMutations(styles: readonly StyleMutation[], textId: number): readonly StyleMutation[] {
  return styles.filter(({ id }) => id === textId)
}

function hasPointerValue(styles: readonly StyleMutation[], textId: number, value: "auto" | "none"): boolean {
  return textStyleMutations(styles, textId).some(({ styleJson }) => styleJson.includes(`"pointerEvents":"${value}"`))
}

function hasPointerProperty(styles: readonly StyleMutation[], textId: number): boolean {
  return textStyleMutations(styles, textId).some(({ styleJson }) => styleJson.includes('"pointerEvents"'))
}

function hasImplicitStyleReset(styles: readonly StyleMutation[], textId: number): boolean {
  return textStyleMutations(styles, textId).some(({ styleJson }) => !styleJson.includes('"pointerEvents"'))
}

const renderer = new RecordingRenderer()
const events = new EventRegistry()
const driver = new MutationDriver(renderer, events)
const root = new HostRootNode(renderer, events, driver)

const surface = createHostElement("div")
const outerNone = createHostElement("div")
const innerOverride = createHostElement("div")
const inheritedText = createHostText("Git Settings")
const ordinaryAuto = createHostElement("div")
const ordinaryText = createHostText("Format")

setHostProperty(outerNone, "style", { pointerEvents: "none" })
setHostProperty(ordinaryAuto, "style", { pointerEvents: "auto" })
insertHostNode(innerOverride, inheritedText)
insertHostNode(outerNone, innerOverride)
insertHostNode(ordinaryAuto, ordinaryText)
insertHostNode(surface, outerNone)
insertHostNode(surface, ordinaryAuto)
insertHostNode(root, surface)
driver.flush()

requireCondition(
  hasPointerValue(renderer.styles, inheritedText.id, "none"),
  "raw retained text must inherit pointer-events:none from a decorative ancestor",
)
requireCondition(
  !hasPointerProperty(renderer.styles, ordinaryText.id),
  "ordinary pointer-events:auto ancestry must stay implicit for raw retained text",
)

let checkpoint = renderer.styles.length
setHostProperty(innerOverride, "style", { pointerEvents: "auto" })
driver.flush()
let changes = renderer.styles.slice(checkpoint)
requireCondition(
  hasImplicitStyleReset(changes, inheritedText.id),
  "a nearer pointer-events:auto must clear inherited none on raw retained text",
)
requireCondition(
  !hasPointerValue(changes, inheritedText.id, "auto"),
  "a nearer pointer-events:auto must not materialize an independent native text hit target",
)

checkpoint = renderer.styles.length
setHostProperty(innerOverride, "style", { pointerEvents: "none" })
driver.flush()
changes = renderer.styles.slice(checkpoint)
requireCondition(
  hasPointerValue(changes, inheritedText.id, "none"),
  "raw retained text must restore pointer-events:none when the nearer ancestor becomes decorative again",
)

checkpoint = renderer.styles.length
setHostProperty(innerOverride, "style", {})
setHostProperty(outerNone, "style", {})
driver.flush()
changes = renderer.styles.slice(checkpoint)
requireCondition(
  hasImplicitStyleReset(changes, inheritedText.id),
  "raw retained text must clear materialized pointer-events:none when decorative ancestry is removed",
)
requireCondition(
  !hasPointerValue(changes, inheritedText.id, "auto"),
  "clearing decorative ancestry must not materialize pointer-events:auto on raw retained text",
)

driver.dispose()
console.log("solid1 retained text pointer-events compatibility: passed")
