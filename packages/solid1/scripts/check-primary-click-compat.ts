import assert from "node:assert/strict"
import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { EventRegistry } from "../src/host/events.js"

function primaryMouseUp(elementId: number) {
  return {
    elementId,
    eventType: "mouseUp",
    x: 24,
    y: 16,
    button: 0,
  } satisfies NativeEventPayload
}

{
  const events = new EventRegistry()
  const elementId = 7
  let clicks = 0

  events.activate(elementId)
  events.set(elementId, "click", () => {
    clicks += 1
  })

  const mouseUp = primaryMouseUp(elementId)
  events.dispatch(mouseUp)
  assert.equal(clicks, 1, "primary mouse-up should deliver one browser click")

  events.dispatch({ ...mouseUp, eventType: "click" })
  assert.equal(clicks, 1, "newer native click delivery must not duplicate the mouse-up click")

  events.dispatch({ ...mouseUp, eventType: "mouseUp", button: 2 })
  assert.equal(clicks, 1, "non-primary mouse-up must not synthesize a click")
}

{
  const events = new EventRegistry()
  const parentId = 11
  const childId = 12
  let parentClicks = 0

  events.activate(parentId)
  events.activate(childId)
  events.set(parentId, "click", () => {
    parentClicks += 1
  })
  events.setParent(childId, parentId)

  const mouseUp = primaryMouseUp(childId)
  events.dispatch(mouseUp)
  assert.equal(parentClicks, 1, "nested primary activation should resolve to the nearest click owner")

  events.dispatch({ ...mouseUp, eventType: "click" })
  assert.equal(parentClicks, 1, "nested native click delivery must deduplicate against the synthesized owner click")

  events.setParent(childId, null)
  events.dispatch(primaryMouseUp(childId))
  assert.equal(parentClicks, 1, "detached nested content must not keep activating its former parent")
}

{
  const events = new EventRegistry()
  const parentId = 21
  const childId = 22
  let parentClicks = 0
  let childClicks = 0

  events.activate(parentId)
  events.activate(childId)
  events.set(parentId, "click", () => {
    parentClicks += 1
  })
  events.set(childId, "click", () => {
    childClicks += 1
  })
  events.setParent(childId, parentId)

  events.dispatch(primaryMouseUp(childId))
  assert.equal(childClicks, 1, "an interactive nested target should keep its own click")
  assert.equal(parentClicks, 0, "nearest click-owner fallback must not replace an exact interactive target")
}

console.log("solid1 embedded primary click compatibility: passed")
