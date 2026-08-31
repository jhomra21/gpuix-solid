import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { StructuredPatchHunk as Hunk } from "diff"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "gpuix-solid"
import { DiffViewer, UNCHANGED_CODE_BG } from "./app"

const simpleHunks: Hunk[] = [
  {
    oldStart: 1,
    oldLines: 4,
    newStart: 1,
    newLines: 4,
    lines: [
      " const x = 1;",
      "-const y = 2;",
      "+const y = 3;",
      " const z = x + y;",
    ],
  },
]

const multiHunkPatch: Hunk[] = [
  {
    oldStart: 1,
    oldLines: 5,
    newStart: 1,
    newLines: 7,
    lines: [
      " import React from 'react'",
      " import { useState } from 'react'",
      " ",
      "-function Counter({ initial }: { initial: number }) {",
      "-  const [count, setCount] = useState(initial)",
      "+interface CounterProps {",
      "+  initial: number",
      "+  step?: number",
      "+}",
      "+",
      "+function Counter({ initial, step = 1 }: CounterProps) {",
      "+  const [count, setCount] = useState(initial)",
    ],
  },
  {
    oldStart: 10,
    oldLines: 4,
    newStart: 12,
    newLines: 6,
    lines: [
      "       <span>{count}</span>",
      "-      <button onClick={() => setCount(c => c + 1)}>+</button>",
      "-      <button onClick={() => setCount(c => c - 1)}>-</button>",
      "+      <button onClick={() => setCount(c => c + step)}>",
      "+        Increment by {step}",
      "+      </button>",
      "+      <button onClick={() => setCount(c => c - step)}>",
      "+        Decrement by {step}",
      "+      </button>",
      "     </div>",
    ],
  },
]

const longHunk: Hunk[] = [
  {
    oldStart: 1,
    oldLines: 30,
    newStart: 1,
    newLines: 32,
    lines: [
      " // Line 1: imports",
      " import fs from 'fs'",
      " import path from 'path'",
      " ",
      "-const VERSION = '1.0.0'",
      "+const VERSION = '2.0.0'",
      " ",
      " function readFile(name: string) {",
      "   const full = path.join(__dirname, name)",
      "   return fs.readFileSync(full, 'utf-8')",
      " }",
      " ",
      " function writeFile(name: string, data: string) {",
      "-  fs.writeFileSync(name, data)",
      "+  const full = path.join(__dirname, name)",
      "+  fs.writeFileSync(full, data, 'utf-8')",
      " }",
      " ",
      " function processAll() {",
      "   const files = fs.readdirSync('.')",
      "   for (const file of files) {",
      "     const content = readFile(file)",
      "-    console.log(file, content.length)",
      "+    const processed = content.trim()",
      "+    console.log(file, processed.length)",
      "   }",
      " }",
      " ",
      " export { readFile, writeFile, processAll }",
      " export default { VERSION }",
    ],
  },
]

function screenshotPath(name: string): string {
  return join(tmpdir(), `gpuix-solid-diff-${name}.png`)
}

function clean(path: string): void {
  if (existsSync(path)) unlinkSync(path)
}

function allText(root: ReturnType<typeof createTestRoot>): string {
  return root.renderer.getAllText().join("")
}

function renderFixture(
  hunks: Hunk[],
  filePath: string,
  splitView: boolean,
  height = 600,
) {
  const root = createTestRoot(900, height)
  root.render(() => (
    <div
      testId="diff-test-scroll"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: UNCHANGED_CODE_BG,
        overflow: "scroll",
      }}
    >
      <DiffViewer hunks={hunks} filePath={filePath} splitView={splitView} />
    </div>
  ))
  return root
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("diff integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  {
    const root = renderFixture(simpleHunks, "test.ts", false)
    const path = screenshotPath("unified-simple")
    try {
      assert.match(allText(root), /const/)
      clean(path)
      root.renderer.captureScreenshot(path)
      assert.equal(existsSync(path), true)
      assert.ok(statSync(path).size > 0)
    } finally {
      root.unmount()
    }
  }

  {
    const root = renderFixture(multiHunkPatch, "counter.tsx", false)
    const path = screenshotPath("unified-multi")
    try {
      const text = allText(root)
      assert.match(text, /import/)
      assert.match(text, /button/)
      assert.match(text, /\.\.\./)
      clean(path)
      root.renderer.captureScreenshot(path)
      assert.ok(statSync(path).size > 0)
    } finally {
      root.unmount()
    }
  }

  {
    const root = renderFixture(simpleHunks, "test.ts", true)
    const path = screenshotPath("split-simple")
    try {
      assert.match(allText(root), /const/)
      clean(path)
      root.renderer.captureScreenshot(path)
      assert.ok(statSync(path).size > 0)
    } finally {
      root.unmount()
    }
  }

  {
    const root = renderFixture(multiHunkPatch, "counter.tsx", true)
    const path = screenshotPath("split-multi")
    try {
      clean(path)
      root.renderer.captureScreenshot(path)
      assert.ok(statSync(path).size > 0)
    } finally {
      root.unmount()
    }
  }

  if (process.platform !== "win32") {
    const root = renderFixture(longHunk, "utils.ts", false, 300)
    const app = createTestApp(root.renderer)
    const before = screenshotPath("scroll-before")
    const after = screenshotPath("scroll-after")
    try {
      clean(before)
      clean(after)
      root.renderer.captureScreenshot(before)

      const scroll = app.getByTestId("diff-test-scroll")
      const bounds = await scroll.bounds()
      root.renderer.nativeSimulateScrollWheel(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        0,
        -200,
      )

      root.renderer.captureScreenshot(after)
      assert.equal(existsSync(before), true)
      assert.equal(existsSync(after), true)
      assert.equal(readFileSync(before).equals(readFileSync(after)), false)
    } finally {
      await app.close()
      root.unmount()
    }
  } else {
    // The published GPUIX 0.6 release CI does not reach example tests on
    // Windows because its own TestGpuixRenderer verification fails first.
    // Keep every static Diff render case above on Windows, but require the
    // native wheel-paint assertion only on backends where upstream verifies it.
    console.log("diff integration: native wheel screenshot check skipped on Windows")
  }

  {
    const root = renderFixture([], "empty.ts", false)
    const path = screenshotPath("empty")
    try {
      assert.match(allText(root), /No changes/)
      clean(path)
      root.renderer.captureScreenshot(path)
      assert.equal(existsSync(path), true)
    } finally {
      root.unmount()
    }
  }

  console.log("diff integration: passed")
}

await main()
