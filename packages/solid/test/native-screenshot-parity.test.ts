import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createComponent, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { animate } from "../src/components/animate.js"
import type { HostNode } from "../src/host/nodes.js"
import { insert } from "../src/host/universal.js"
import {
  createTestRoot,
  hasNativeTestRenderer,
  TestRenderer,
} from "../src/testing.js"
import {
  createNestedStyleFixture,
  createOrderedTextFixture,
} from "./native-parity-fixtures.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip
const isCI = Boolean(process.env.CI)
const builtInTypes = new Set(["div", "text"])

function screenshotPath(name: string): string {
  const file = path.join(os.tmpdir(), `gpuix-solid-${name}.png`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return file
}

function screenshotBuffer(file: string): Buffer {
  expect(fs.existsSync(file)).toBe(true)
  expect(fs.statSync(file).size).toBeGreaterThan(0)
  return fs.readFileSync(file)
}

function bufferSimilarity(left: Buffer, right: Buffer): number {
  const length = Math.max(left.length, right.length)
  if (length === 0) return 1
  let matching = 0
  for (let index = 0; index < length; index++) {
    if (left[index] === right[index]) matching++
  }
  return matching / length
}

function expectScreenshotsEqual(leftPath: string, rightPath: string): void {
  const left = screenshotBuffer(leftPath)
  const right = screenshotBuffer(rightPath)
  expect(left.equals(right)).toBe(true)
}

function expectScreenshotsDiffer(beforePath: string, afterPath: string): void {
  const before = screenshotBuffer(beforePath)
  const after = screenshotBuffer(afterPath)
  if (isCI) return
  expect(bufferSimilarity(before, after)).toBeLessThan(0.99)
}

function expectScreenshotsNotEqual(beforePath: string, afterPath: string): void {
  const before = screenshotBuffer(beforePath)
  const after = screenshotBuffer(afterPath)
  if (isCI) return
  expect(before.equals(after)).toBe(false)
}

function renderDetachedTreeDirect(renderer: TestRenderer, root: HostNode): void {
  let nextId = 1

  const visit = (node: HostNode): number => {
    const id = nextId++
    renderer.createElement(id, node.type)

    if (node.kind === "text") {
      renderer.setText(id, node.text)
    } else {
      if (node.style) renderer.setStyle(id, JSON.stringify(node.style))
      for (const eventType of node.events.keys()) {
        renderer.setEventListener(id, eventType, true)
      }
      for (const [name, value] of node.props) {
        if (name === "testId" || !builtInTypes.has(node.type)) {
          renderer.setCustomProp(id, name, JSON.stringify(value))
        }
      }
    }

    for (const child of node.children) {
      const childId = visit(child)
      renderer.appendChild(id, childId)
    }
    return id
  }

  renderer.setRoot(visit(root))
  renderer.commitMutations()
  renderer.flush()
}

function elementWidth(renderer: TestRenderer, elementId: number): number {
  const width = renderer.getElementBounds(elementId)?.[2]
  if (width === undefined) {
    throw new Error(`Native element ${elementId} did not expose painted bounds`)
  }
  return width
}

describe("native screenshot parity", () => {
  nativeIt("matches direct native rendering for the retained-tree fixture", () => {
    const solidPath = screenshotPath("parity-solid")
    const directPath = screenshotPath("parity-direct")

    const testRoot = createTestRoot()
    testRoot.render(() => createNestedStyleFixture())
    expect(testRoot.renderer.getAllText()).toEqual([
      "01",
      "Line content that may wrap",
      "Second line of content",
    ])
    testRoot.renderer.captureScreenshot(solidPath)
    testRoot.unmount()

    const directRenderer = new TestRenderer()
    renderDetachedTreeDirect(directRenderer, createNestedStyleFixture())
    expect(directRenderer.getAllText()).toEqual([
      "01",
      "Line content that may wrap",
      "Second line of content",
    ])
    directRenderer.captureScreenshot(directPath)

    expectScreenshotsEqual(solidPath, directPath)
  })

  nativeIt("changes on reorder and returns to the original frame", () => {
    const initialPath = screenshotPath("reorder-initial")
    const reorderedPath = screenshotPath("reorder-changed")
    const restoredPath = screenshotPath("reorder-restored")
    const testRoot = createTestRoot()
    const { root, alpha, beta, gamma } = createOrderedTextFixture()
    const [order, setOrder] = createSignal([alpha, beta, gamma])

    testRoot.render(() => {
      insert(root, order)
      return root
    })
    expect(testRoot.renderer.getAllText()).toEqual(["alpha", "beta", "gamma"])
    testRoot.renderer.captureScreenshot(initialPath)

    testRoot.root.flushSync(() => setOrder([gamma, alpha, beta]))
    testRoot.renderer.flush()
    expect(testRoot.renderer.getAllText()).toEqual(["gamma", "alpha", "beta"])
    testRoot.renderer.captureScreenshot(reorderedPath)

    testRoot.root.flushSync(() => setOrder([alpha, beta, gamma]))
    testRoot.renderer.flush()
    expect(testRoot.renderer.getAllText()).toEqual(["alpha", "beta", "gamma"])
    testRoot.renderer.captureScreenshot(restoredPath)

    expectScreenshotsDiffer(initialPath, reorderedPath)
    expectScreenshotsEqual(initialPath, restoredPath)
    testRoot.unmount()
  })

  nativeIt("captures deterministic animation endpoints", () => {
    const initialPath = screenshotPath("animation-initial")
    const finalPath = screenshotPath("animation-final")
    const testRoot = createTestRoot()
    testRoot.renderer.clockPause()

    testRoot.render(() =>
      createComponent(animate.div, {
        initial: { width: 80 },
        to: { width: 240 },
        transition: { duration: 1, ease: "linear" },
        style: {
          height: 80,
          backgroundColor: "#89b4fa",
        },
      }),
    )

    const animated = testRoot.renderer.findByType("div")[0]
    expect(animated).toBeDefined()
    const id = animated?.id ?? 0
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(80, 1)
    testRoot.renderer.captureScreenshot(initialPath)

    testRoot.renderer.clockFastForward(1000)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(240, 1)
    testRoot.renderer.captureScreenshot(finalPath)

    // The box occupies only a small part of the full screenshot. A whole-PNG
    // <99% byte-similarity threshold therefore says more about PNG compression
    // than about this localized animation. The native bounds prove the rendered
    // geometry reached both endpoints; this assertion proves the two painted
    // endpoint frames did not encode to the same image.
    expectScreenshotsNotEqual(initialPath, finalPath)
    testRoot.renderer.clockResume()
    testRoot.unmount()
  })
})
