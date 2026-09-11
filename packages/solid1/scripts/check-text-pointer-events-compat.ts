import assert from "node:assert/strict"
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

type RecordedMutation = readonly [name: string, ...args: unknown[]]

const batches: RecordedMutation[][] = []
const renderer = {
  applyBatch(json: string): number[] {
    batches.push(JSON.parse(json) as RecordedMutation[])
    return []
  },
} as unknown as NativeRenderer
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

function textStylesSince(batchIndex: number): Record<string, unknown>[] {
  return batches
    .slice(batchIndex)
    .flat()
    .filter((mutation) => mutation[0] === "setStyle" && mutation[1] === text.id)
    .map((mutation) => mutation[2] as Record<string, unknown>)
}

assert.ok(
  textStylesSince(0).some((style) => style.pointerEvents === "none"),
  "raw retained text must inherit pointer-events:none from a decorative ancestor",
)

let checkpoint = batches.length
setHostProperty(decorativeLabel, "style", { pointerEvents: "auto" })
driver.flush()
assert.ok(
  textStylesSince(checkpoint).some((style) => style.pointerEvents === "auto"),
  "raw retained text must honor a descendant pointer-events:auto re-enable",
)

checkpoint = batches.length
setHostProperty(decorativeLabel, "style", {})
driver.flush()
assert.ok(
  textStylesSince(checkpoint).some((style) => style.pointerEvents === undefined),
  "raw retained text must clear a previously materialized pointer-events value",
)

driver.dispose()
console.log("solid1 retained text pointer-events compatibility: passed")
