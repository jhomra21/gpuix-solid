import assert from "node:assert/strict"
import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { EventRegistry } from "../src/host/events.js"

const events = new EventRegistry()
const elementId = 7
let clicks = 0

events.activate(elementId)
events.set(elementId, "click", () => {
  clicks += 1
})

const primaryMouseUp = {
  elementId,
  eventType: "mouseUp",
  x: 24,
  y: 16,
  button: 0,
} satisfies NativeEventPayload

events.dispatch(primaryMouseUp)
assert.equal(clicks, 1, "primary mouse-up should deliver one browser click")

events.dispatch({ ...primaryMouseUp, eventType: "click" })
assert.equal(clicks, 1, "newer native click delivery must not duplicate the mouse-up click")

events.dispatch({ ...primaryMouseUp, eventType: "mouseUp", button: 2 })
assert.equal(clicks, 1, "non-primary mouse-up must not synthesize a click")

console.log("solid1 embedded primary click compatibility: passed")
