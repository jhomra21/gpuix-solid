import { createRequire } from "node:module"
import { readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const native = require("@gpuix/native")

if (native.hasTestGpuixRenderer?.() !== true || typeof native.TestGpuixRenderer !== "function") {
  throw new Error("GPUIX edge validation requires a source build with TestGpuixRenderer")
}

checkAccessibility(native.TestGpuixRenderer)
checkTextareaNewline(native.TestGpuixRenderer)
checkTextDecoration(native.TestGpuixRenderer)

console.log("GPUIX edge native capabilities: accessibility, textarea newline, and text decoration passed")

function checkAccessibility(TestGpuixRenderer) {
  const renderer = new TestGpuixRenderer(320, 160)
  if (typeof renderer.getA11yTree !== "function") {
    throw new Error("Pinned GPUIX edge native is missing getA11yTree()")
  }

  renderer.applyBatch(JSON.stringify([
    ["createElement", 1, "div"],
    ["setStyle", 1, { width: 320, height: 160 }],
    ["createElement", 2, "div"],
    ["setStyle", 2, { width: 120, height: 40 }],
    ["setCustomProp", 2, "role", "button"],
    ["setCustomProp", 2, "aria-label", "Edge button"],
    ["setCustomProp", 2, "aria-id", "edge.button"],
    ["setEventListener", 2, "click", true],
    ["appendChild", 1, 2],
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
}

function checkTextareaNewline(TestGpuixRenderer) {
  const renderer = new TestGpuixRenderer(320, 160)
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

function checkTextDecoration(TestGpuixRenderer) {
  const plainPath = join(tmpdir(), `gpuix-edge-plain-${process.pid}.png`)
  const decoratedPath = join(tmpdir(), `gpuix-edge-underline-${process.pid}.png`)
  try {
    renderText(TestGpuixRenderer, plainPath, "none")
    renderText(TestGpuixRenderer, decoratedPath, "underline")
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

function renderText(TestGpuixRenderer, path, textDecoration) {
  const renderer = new TestGpuixRenderer(320, 100)
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
