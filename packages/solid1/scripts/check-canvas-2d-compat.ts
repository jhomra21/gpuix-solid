import { readFileSync } from "node:fs"
import { createCanvas2DCompatSurface } from "../src/canvas-2d-compat.ts"

const packageRoot = new URL("../", import.meta.url)
const repoRoot = new URL("../../../", import.meta.url)
const solid1 = readFileSync(new URL("src/canvas-2d-compat.ts", packageRoot), "utf8")
const solid2 = readFileSync(new URL("packages/solid/src/canvas-2d-compat.ts", repoRoot), "utf8")
if (solid1 !== solid2) throw new Error("Solid 1 Canvas2D compatibility drifted from Solid 2")

const surface = createCanvas2DCompatSurface(() => ({ width: 200, height: 100 }))
const ctx = surface.context
ctx.setTransform(2, 0, 0, 2, 0, 0)
ctx.clearRect(0, 0, 100, 50)
ctx.fillStyle = "rgba(10, 20, 30, 0.5)"
ctx.fillRect(10, 5, 2, 4)
ctx.strokeStyle = "#abcdef"
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(0, 1)
ctx.lineTo(100, 1)
ctx.stroke()

const svg = surface.toSvg()
if (!svg.includes('viewBox="0 0 200 100"')) throw new Error(`Canvas2D SVG must preserve backing dimensions: ${svg}`)
if (!svg.includes('points="20,10 24,10 24,18 20,18"')) throw new Error(`Canvas2D fillRect must honor setTransform: ${svg}`)
if (!svg.includes('fill="rgba(10, 20, 30, 0.5)"')) throw new Error(`Canvas2D fill paint must survive native normalization: ${svg}`)
if (!svg.includes('points="0,2 200,2"') || !svg.includes('stroke-width="2"')) {
  throw new Error(`Canvas2D stroke path must honor transformed coordinates and line width: ${svg}`)
}

let partialClearRejected = false
try {
  ctx.clearRect(0, 0, 10, 10)
} catch {
  partialClearRejected = true
}
if (!partialClearRejected) throw new Error("Canvas2D compatibility must fail closed for unsupported partial clearRect")

console.log("Solid Canvas2D compatibility checks passed")
