import { readFileSync } from "node:fs"
import {
  applyNativeStyleParentPosition,
  applyNativeStyleTranslation,
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  resolveNativeClassStyle,
  resolveNativeClassParentPosition,
  resolveNativeClassTranslation,
} from "../src/native-style.ts"
import { EventRegistry } from "../src/host/events.ts"
import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"

const packageRoot = new URL("../", import.meta.url)
const repoRoot = new URL("../../../", import.meta.url)
const sharedFiles = ["events.ts", "mutations.ts", "nodes.ts", "types.ts"] as const

for (const file of sharedFiles) {
  const solid1 = readFileSync(new URL(`src/host/${file}`, packageRoot), "utf8")
  const solid2 = readFileSync(new URL(`packages/solid/src/host/${file}`, repoRoot), "utf8")
  if (solid1 !== solid2) {
    throw new Error(`Solid 1 host mirror drifted from Solid 2: ${file}`)
  }
}

configureNativeStyleManifest({
  classes: {
    "bg-app-surface": { base: { backgroundColor: "#111111" } },
    "text-foreground": { base: { color: "#eeeeee" } },
  },
})
const combinedClassListStyle = resolveNativeClassStyle(undefined, {
  "bg-app-surface text-foreground": true,
})
clearNativeStyleManifest()
if (combinedClassListStyle?.backgroundColor !== "#111111" || combinedClassListStyle.color !== "#eeeeee") {
  throw new Error("Solid 1 native classList must split multi-class keys before manifest lookup")
}

const selectorRoot = createHostElement("div", "section")
const selectorButton = createHostElement("div", "button")
const selectorLabel = createHostElement("text", "span")
setHostProperty(selectorButton, "data-track-name", "true")
setHostProperty(selectorButton, "role", "button")
setHostProperty(selectorButton, "data-track-id", "track-7")
insertHostNode(selectorRoot, selectorButton)
insertHostNode(selectorButton, selectorLabel)
if (selectorLabel.closest("[data-track-name]") !== selectorButton) throw new Error("closest must resolve ancestor data attributes")
if (selectorLabel.closest("button, input, select, textarea, [role='button']") !== selectorButton) throw new Error("closest must resolve selector lists and semantic tags")
if (!selectorRoot.contains(selectorLabel) || selectorLabel.contains(selectorRoot)) throw new Error("contains must follow host ancestry")
if (selectorButton.dataset.trackId !== "track-7") throw new Error("dataset must expose data-* properties")

configureNativeStyleManifest({
  classes: {
    "-translate-x-1/2": { translation: { xFraction: -0.5 } },
    "translate-y-1/2": { translation: { yFraction: 0.5 } },
  },
})
const translation = resolveNativeClassTranslation("-translate-x-1/2 translate-y-1/2", undefined)
const translatedStyle = applyNativeStyleTranslation({ width: 16, height: 12 }, translation)
configureNativeStyleManifest({ classes: { "left-1/2": { parentPosition: { leftFraction: 0.5 } } } })
const parentPosition = resolveNativeClassParentPosition("left-1/2", undefined)
const centeredStyle = applyNativeStyleParentPosition({ width: 6 }, parentPosition, 16, 20)
clearNativeStyleManifest()
if (translatedStyle?.marginLeft !== -8 || translatedStyle.marginTop !== 6) {
  throw new Error(`fractional native translation must resolve against final own size: ${JSON.stringify(translatedStyle)}`)
}
if (centeredStyle?.left !== 8) {
  throw new Error(`parent-relative native position must resolve against parent size: ${JSON.stringify(centeredStyle)}`)
}
selectorButton.removeAttribute("data-track-name")
if (selectorLabel.closest("[data-track-name]") !== null) throw new Error("removeAttribute must update selector matching")

const semanticButton = createHostElement("div", "button")
if (semanticButton.localName !== "button" || semanticButton.tagName !== "BUTTON") throw new Error("host must retain semantic tag identity")
let localEvents = 0
semanticButton.addEventListener("click", () => { localEvents += 1 })
semanticButton.dispatchEvent(new Event("click", { cancelable: true }))
if (localEvents !== 1) throw new Error("native host EventTarget listener must fire")

const eventRegistry = new EventRegistry()
const pointerOwner = createHostElement("div", "button")
const pointerOther = createHostElement("div", "button")
eventRegistry.activate(1)
eventRegistry.activate(2)
eventRegistry.setTarget(1, pointerOwner)
eventRegistry.setTarget(2, pointerOther)
const pointerEvents: string[] = []
eventRegistry.set(1, "pointerDown", (event) => {
  pointerEvents.push("pointerDown")
  eventRegistry.setPointerCapture(1, event.pointerId ?? 0)
})
eventRegistry.set(1, "mouseDown", () => pointerEvents.push("mouseDown"))
eventRegistry.set(1, "pointerMove", () => pointerEvents.push("pointerMove"))
eventRegistry.set(1, "pointerUp", () => pointerEvents.push("pointerUp"))
eventRegistry.set(1, "lostPointerCapture", () => pointerEvents.push("lostPointerCapture"))
eventRegistry.dispatch({ elementId: 1, eventType: "mouseDown", x: 5, y: 5, button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0])
eventRegistry.dispatch({ elementId: 2, eventType: "mouseMove", x: 50, y: 5, button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0])
if (!eventRegistry.hasPointerCapture(1, 0)) throw new Error("pointer capture must remain active across another element")
eventRegistry.dispatch({ elementId: 2, eventType: "mouseUp", x: 50, y: 5, button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0])
if (pointerEvents.join(",") !== "pointerDown,mouseDown,pointerMove,pointerUp,lostPointerCapture") {
  throw new Error(`captured pointer move must retarget to capture owner: ${pointerEvents.join(",")}`)
}
if (eventRegistry.hasPointerCapture(1, 0)) throw new Error("pointer capture must release after pointerup")

const separateHandlers = createHostElement("div", "button")
let mouseDownCount = 0
let pointerDownCount = 0
setHostProperty(separateHandlers, "onMouseDown", () => { mouseDownCount += 1 })
setHostProperty(separateHandlers, "onPointerDown", () => { pointerDownCount += 1 })
if (!separateHandlers.events.has("mouseDown") || !separateHandlers.events.has("pointerDown")) {
  throw new Error("mouse and pointer handlers must coexist without overwriting each other")
}

const doubleClickRegistry = new EventRegistry()
const doubleClickTarget = createHostElement("div", "button")
doubleClickRegistry.activate(3)
doubleClickRegistry.setTarget(3, doubleClickTarget)
let doubleClicks = 0
doubleClickRegistry.set(3, "dblClick", () => { doubleClicks += 1 })
const click = { elementId: 3, eventType: "click", x: 10, y: 10, button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0]
doubleClickRegistry.dispatch(click)
doubleClickRegistry.dispatch(click)
if (doubleClicks !== 1) throw new Error("double click must be synthesized once from two nearby clicks")

console.log("solid1 host parity: passed")
