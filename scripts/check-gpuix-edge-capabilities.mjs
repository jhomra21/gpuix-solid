import { createRequire } from "node:module"
import { readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const native = require("@gpuix/native")
const TestGpuixRenderer = native.TestGpuixRenderer

if (native.hasTestGpuixRenderer?.() !== true || !TestGpuixRenderer) {
  throw new Error("GPUIX edge validation requires a source build with TestGpuixRenderer")
}

checkAccessibility(TestGpuixRenderer)
checkTextareaNewline(TestGpuixRenderer)
checkTextDecoration(TestGpuixRenderer)
checkVirtualListScrollSurface(TestGpuixRenderer)

console.log(
  "GPUIX edge native capabilities: accessibility, textarea newline, text decoration, and virtual-list scroll surface passed",
)

function checkAccessibility(Renderer) {
  const renderer = new Renderer(480, 320)
  renderer.applyBatch(JSON.stringify([
    ["createElement", 1, "div"],
    ["setStyle", 1, { width: 480, height: 320 }],

    ["createElement", 2, "div"],
    ["setStyle", 2, { width: 120, height: 40 }],
    ["setCustomProp", 2, "role", "button"],
    ["setCustomProp", 2, "aria-label", "Edge button"],
    ["setCustomProp", 2, "aria-id", "edge.button"],
    ["setEventListener", 2, "click", true],

    ["createElement", 3, "img"],
    ["setStyle", 3, { width: 40, height: 40 }],
    ["setCustomProp", 3, "src", ""],
    ["setCustomProp", 3, "alt", "Empty source"],

    ["createElement", 4, "anchored"],
    ["setStyle", 4, { width: 80, height: 40 }],
    ["setCustomProp", 4, "role", "menu"],
    ["setCustomProp", 4, "aria-label", "File menu"],
    ["setCustomProp", 4, "position", { x: 8, y: 8 }],

    ["createElement", 5, "virtual-list"],
    ["setStyle", 5, { width: 200, height: 80 }],
    ["setCustomProp", 5, "role", "list"],
    ["setCustomProp", 5, "aria-label", "Messages"],

    // Match React's host-config exactly: the outer <text> host stays contentless
    // and receives the default Label role; its HostText child owns the string.
    ["createElement", 6, "text"],
    ["setStyle", 6, { width: 200, height: 24 }],
    ["createElement", 7, "text"],
    ["setText", 7, "Hello Ada!"],
    ["appendChild", 6, 7],

    ["appendChild", 1, 2],
    ["appendChild", 1, 3],
    ["appendChild", 1, 4],
    ["appendChild", 1, 5],
    ["appendChild", 1, 6],
    ["setRoot", 1],
  ]))
  renderer.flush()

  const tree = JSON.parse(renderer.getA11yTree())
  const ariaNodes = Object.values(tree.nodes ?? {})
    .map((node) => node?.aria)
    .filter(Boolean)
  const button = ariaNodes.find((aria) => aria.role === "Button" && aria.label === "Edge button")
  if (!button) throw new Error(`GPUIX edge accessibility tree omitted the button: ${JSON.stringify(tree)}`)
  if (button.author_id !== "edge.button") throw new Error(`GPUIX edge accessibility author id mismatch: ${JSON.stringify(button)}`)
  if (!Array.isArray(button.on_action) || !button.on_action.includes("Click")) {
    throw new Error(`GPUIX edge accessibility click action missing: ${JSON.stringify(button)}`)
  }
  assertAriaNode(ariaNodes, "Image", "Empty source")
  assertAriaNode(ariaNodes, "Menu", "File menu")
  assertAriaNode(ariaNodes, "List", "Messages")
  const label = ariaNodes.find((aria) => aria.role === "Label" && aria.value === "Hello Ada!")
  if (!label) throw new Error(`GPUIX edge accessibility text label missing: ${JSON.stringify(tree)}`)
}

function assertAriaNode(nodes, role, label) {
  if (!nodes.some((aria) => aria.role === role && aria.label === label)) {
    throw new Error(`GPUIX edge accessibility node missing: ${role} / ${label}`)
  }
}

function checkVirtualListScrollSurface(Renderer) {
  const renderer = new Renderer(320, 180)
  const operations = [
    ["createElement", 1, "div"],
    ["setStyle", 1, { width: 320, height: 180 }],
    ["createElement", 2, "virtual-list"],
    ["setStyle", 2, { width: 200, height: 80 }],
    ["setCustomProp", 2, "estimatedItemHeight", 32],
    ["setCustomProp", 2, "overdraw", 0],
    ["setEventListener", 2, "scroll", true],
  ]

  for (let index = 0; index < 12; index += 1) {
    const rowId = 10 + index
    const textId = 100 + index
    operations.push(
      ["createElement", rowId, "div"],
      ["setStyle", rowId, { width: 200, height: 32 }],
      ["createElement", textId, "text"],
      ["setText", textId, `Row ${index + 1}`],
      ["appendChild", rowId, textId],
      ["appendChild", 2, rowId],
    )
  }

  operations.push(["appendChild", 1, 2], ["setRoot", 1])
  renderer.applyBatch(JSON.stringify(operations))
  renderer.flush()

  const bounds = renderer.getElementBounds(2)
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`GPUIX virtual-list painted bounds missing: ${JSON.stringify(bounds)}`)
  }

  const before = renderer.getScrollOffset(2)
  if (!before) {
    throw new Error("GPUIX virtual-list has no native scroll offset before wheel input")
  }

  renderer.drainEvents()
  renderer.simulateScrollWheel(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    0,
    -48,
  )
  renderer.flush()

  const after = renderer.getScrollOffset(2)
  if (!after || after[1] >= before[1]) {
    throw new Error(
      `GPUIX virtual-list wheel did not advance the native offset: ${JSON.stringify({ before, after })}`,
    )
  }

  const scroll = renderer
    .drainEvents()
    .filter((event) => event.elementId === 2 && event.eventType === "scroll")
    .at(-1)
  if (!scroll) {
    throw new Error("GPUIX virtual-list did not emit a native scroll event")
  }

  const metrics = {
    offsetY: scroll.scrollOffsetY,
    maxY: scroll.scrollMaxY,
    viewportWidth: scroll.scrollViewportWidth,
    viewportHeight: scroll.scrollViewportHeight,
  }
  if (
    !Number.isFinite(metrics.offsetY) ||
    !Number.isFinite(metrics.maxY) ||
    !Number.isFinite(metrics.viewportWidth) ||
    !Number.isFinite(metrics.viewportHeight) ||
    metrics.offsetY >= 0 ||
    metrics.maxY <= 0 ||
    metrics.viewportWidth <= 0 ||
    metrics.viewportHeight <= 0
  ) {
    throw new Error(`GPUIX virtual-list scroll metrics invalid: ${JSON.stringify(metrics)}`)
  }
}

function checkTextareaNewline(Renderer) {
  const renderer = new Renderer(320, 160)
  renderer.applyBatch(JSON.stringify([
    ["createElement", 1, "div"],
    ["setStyle", 1, { width: 320, height: 160 }],
    ["createElement", 2, "textarea"],
    ["setStyle", 2, { width: 240, height: 80 }],
    ["setCustomProp", 2, "value", ""],
    ["setEventListener", 2, "change", true],
    ["appendChild", 1, 2],
    ["setRoot", 1],
  ]))
  renderer.flush()
  renderer.focusElement(2)
  renderer.simulateKeystrokes("enter")
  const events = renderer.drainEvents()
  const change = events.find((event) => event.eventType === "change" && event.elementId === 2)
  if (!change || change.value !== "\n") {
    throw new Error(`GPUIX edge textarea Enter did not insert a newline: ${JSON.stringify(events)}`)
  }
}

function checkTextDecoration(Renderer) {
  const plainPath = join(tmpdir(), `gpuix-edge-plain-${process.pid}.png`)
  const decoratedPath = join(tmpdir(), `gpuix-edge-underline-${process.pid}.png`)
  try {
    renderText(Renderer, plainPath, "none")
    renderText(Renderer, decoratedPath, "underline")
    const plain = readFileSync(plainPath)
    const decorated = readFileSync(decoratedPath)
    if (plain.equals(decorated)) {
      throw new Error("GPUIX edge textDecoration did not change native painted output")
    }
  } finally {
    rmSync(plainPath, { force: true })
    rmSync(decoratedPath, { force: true })
  }
}

function renderText(Renderer, path, textDecoration) {
  const renderer = new Renderer(320, 100)
  renderer.applyBatch(JSON.stringify([
    ["createElement", 1, "div"],
    ["setStyle", 1, { width: 320, height: 100, backgroundColor: "#ffffff", padding: 16 }],
    ["createElement", 2, "text"],
    ["setStyle", 2, { color: "#111111", fontSize: 24, textDecoration }],
    ["setText", 2, "Edge decoration"],
    ["appendChild", 1, 2],
    ["setRoot", 1],
  ]))
  renderer.flush()
  renderer.captureScreenshot(path)
}
