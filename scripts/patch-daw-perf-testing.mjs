import { readFileSync, writeFileSync } from "node:fs"

const [file] = process.argv.slice(2)
if (!file) throw new Error("usage: node scripts/patch-daw-perf-testing.mjs <testing.ts>")

const source = readFileSync(file, "utf8")
const marker = "  dragCustomProps(query: TestCustomPropQuery, deltaX: number, deltaY: number): void {"
if (!source.includes(marker)) throw new Error(`benchmark patch marker missing in ${file}`)
if (source.includes("benchmarkDragCustomPropsMoves(")) throw new Error(`benchmark helper already present in ${file}`)

const helper = `  benchmarkDragCustomPropsMoves(\n    query: TestCustomPropQuery,\n    deltas: readonly (readonly [number, number])[],\n  ): { moves: number[]; release: number } {\n    const start = centerPoint(this.boundsCustomProps(query))\n    this.#native.simulateMouseMove(start.x, start.y)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n    this.#native.simulateMouseDown(start.x, start.y, 0)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n\n    const moves: number[] = []\n    let endX = start.x\n    let endY = start.y\n    for (const [deltaX, deltaY] of deltas) {\n      endX = start.x + deltaX\n      endY = start.y + deltaY\n      const moveStart = performance.now()\n      this.#native.simulateMouseMove(endX, endY, 0)\n      this.dispatchNativeEvents()\n      this.#native.flush()\n      moves.push(performance.now() - moveStart)\n    }\n\n    const releaseStart = performance.now()\n    this.#native.simulateMouseUp(endX, endY, 0)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n    return { moves, release: performance.now() - releaseStart }\n  }\n\n`

writeFileSync(file, source.replace(marker, `${helper}${marker}`))
console.log(`patched disposable DAW performance helper into ${file}`)
