import assert from "node:assert/strict"
import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import type { NativeRenderer } from "../src/host/types.js"

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
  const batches: Array<Array<Array<string | number | boolean | object | null>>> = []
  const renderer = {
    applyBatch(json: string) {
      batches.push(JSON.parse(json) as Array<Array<string | number | boolean | object | null>>)
      return []
    },
  } as unknown as NativeRenderer
  const driver = new MutationDriver(renderer, events)
  const parentId = 15
  const childId = 16

  events.activate(parentId)
  events.activate(childId)
  events.set(parentId, "click", () => undefined)
  driver.enqueue("setEventListener", parentId, "click", true)
  driver.enqueue("appendChild", parentId, childId)
  driver.flush()

  const childClickMutations = batches.flat().filter(
    (mutation) => mutation[0] === "setEventListener" && mutation[1] === childId && mutation[2] === "click",
  )
  assert.deepEqual(
    childClickMutations.at(-1),
    ["setEventListener", childId, "click", true],
    "nested retained content should be armed as a native click relay",
  )

  driver.enqueue("removeChild", parentId, childId)
  driver.flush()
  const detachedChildClickMutations = batches.flat().filter(
    (mutation) => mutation[0] === "setEventListener" && mutation[1] === childId && mutation[2] === "click",
  )
  assert.deepEqual(
    detachedChildClickMutations.at(-1),
    ["setEventListener", childId, "click", false],
    "detaching nested retained content should remove its native click relay",
  )
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
