import { readFileSync, writeFileSync } from "node:fs"

function replaceOnce(path, from, to) {
  const source = readFileSync(path, "utf8")
  const matches = source.split(from).length - 1
  if (matches !== 1) {
    throw new Error(`${path}: expected one match, found ${matches}`)
  }
  writeFileSync(path, source.replace(from, to))
}

replaceOnce(
  "packages/solid/src/testing.ts",
  `  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null {\n    this.#native.dragSelect(x1, y1, x2, y2)\n    return this.#native.getSelectedText()\n  }`,
  `  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null {\n    this.#native.dragSelect(x1, y1, x2, y2)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n    return this.#native.getSelectedText()\n  }`,
)

replaceOnce(
  "packages/solid/src/testing.ts",
  `  clearSelection(): void {\n    this.#native.clearSelection()\n    this.#native.flush()\n  }`,
  `  clearSelection(): void {\n    this.#native.clearSelection()\n    this.dispatchNativeEvents()\n    this.#native.flush()\n  }`,
)

replaceOnce(
  "packages/solid/test/native-selection-change.test.ts",
  `    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("hello world")\n    testRoot.renderer.dispatchNativeEvents()\n    expect(values).toEqual(["hello world"])`,
  `    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("hello world")\n    expect(values).toEqual(["hello world"])`,
)

replaceOnce(
  "packages/solid/test/native-selection-change.test.ts",
  `    testRoot.renderer.clearSelection()\n    testRoot.renderer.dispatchNativeEvents()\n    expect(values).toEqual(["hello world", null])`,
  `    testRoot.renderer.clearSelection()\n    expect(values).toEqual(["hello world", null])`,
)

console.log("Selection test renderer now drains native selection events synchronously")
