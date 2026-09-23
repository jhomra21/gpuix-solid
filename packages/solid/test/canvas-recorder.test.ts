import { describe, expect, it, vi } from "vitest"
import {
  CANVAS_DRAW_LIST_VERSION,
  createCanvas2DRecorder,
} from "../src/host/canvas.js"

describe("Canvas2D draw-list recorder", () => {
  it("records common Canvas2D operations in order", () => {
    const changed = vi.fn()
    const recorder = createCanvas2DRecorder(() => ({ width: 320, height: 180 }), changed)
    const ctx = recorder.context

    ctx.fillStyle = "#112233"
    ctx.fillRect(1, 2, 30, 40)

    ctx.strokeStyle = "#abcdef"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10, 5)
    ctx.quadraticCurveTo(12, 8, 20, 10)
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.font = "600 14px Inter"
    ctx.fillText("GPUix", 12, 24)

    const drawList = recorder.snapshot()
    expect(drawList.version).toBe(CANVAS_DRAW_LIST_VERSION)
    expect(drawList.width).toBe(320)
    expect(drawList.height).toBe(180)
    expect(drawList.commands).toHaveLength(3)
    expect(drawList.commands[0]).toMatchObject({
      op: "fillPath",
      color: "#112233",
      path: [
        { op: "moveTo", x: 1, y: 2 },
        { op: "lineTo", x: 31, y: 2 },
        { op: "lineTo", x: 31, y: 42 },
        { op: "lineTo", x: 1, y: 42 },
        { op: "closePath" },
      ],
    })
    expect(drawList.commands[1]).toMatchObject({
      op: "strokePath",
      color: "#abcdef",
      lineWidth: 2,
      path: [
        { op: "moveTo", x: 0, y: 0 },
        { op: "lineTo", x: 10, y: 5 },
        { op: "quadraticCurveTo", cpx: 12, cpy: 8, x: 20, y: 10 },
      ],
    })
    expect(drawList.commands[2]).toMatchObject({
      op: "fillText",
      text: "GPUix",
      x: 12,
      y: 24,
      fontSize: 14,
      fontFamily: "Inter",
      fontWeight: 600,
    })
    expect(changed).toHaveBeenCalledTimes(3)
  })

  it("normalizes transforms before commands cross the native boundary", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 200, height: 100 }))
    const ctx = recorder.context

    ctx.translate(10, 20)
    ctx.scale(2, 3)
    ctx.beginPath()
    ctx.moveTo(1, 2)
    ctx.lineTo(3, 4)
    ctx.fill()

    expect(recorder.snapshot().commands[0]).toMatchObject({
      op: "fillPath",
      path: [
        { op: "moveTo", x: 12, y: 26 },
        { op: "lineTo", x: 16, y: 32 },
      ],
    })
  })

  it("keeps save and restore state out of the native protocol", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    ctx.fillStyle = "red"
    ctx.save()
    ctx.fillStyle = "blue"
    ctx.globalAlpha = 0.5
    ctx.fillRect(0, 0, 10, 10)
    ctx.restore()
    ctx.fillRect(10, 0, 10, 10)

    expect(recorder.snapshot().commands).toMatchObject([
      { op: "fillPath", color: "blue", alpha: 0.5 },
      { op: "fillPath", color: "red", alpha: 1 },
    ])
  })

  it("converts arcs to cubic path segments", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    ctx.beginPath()
    ctx.arc(50, 50, 20, 0, Math.PI * 2)
    ctx.fill()

    const command = recorder.snapshot().commands[0]
    expect(command?.op).toBe("fillPath")
    if (command?.op !== "fillPath") throw new Error("expected fill path")
    expect(command.path[0]).toMatchObject({ op: "moveTo", x: 70, y: 50 })
    expect(command.path.filter((segment) => segment.op === "bezierCurveTo")).toHaveLength(4)
  })

  it("lowers roundRect into the existing path protocol", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 120, height: 80 }))
    const ctx = recorder.context

    ctx.translate(2, 3)
    ctx.beginPath()
    ctx.roundRect(10, 20, 80, 40, 8)
    ctx.fill()

    const command = recorder.snapshot().commands[0]
    expect(command?.op).toBe("fillPath")
    if (command?.op !== "fillPath") throw new Error("expected fill path")
    expect(command.path).toHaveLength(10)
    expect(command.path[0]).toEqual({ op: "moveTo", x: 20, y: 23 })
    expect(command.path[1]).toEqual({ op: "lineTo", x: 84, y: 23 })
    expect(command.path[2]).toMatchObject({ op: "bezierCurveTo", x: 92, y: 31 })
    expect(command.path[8]).toMatchObject({ op: "bezierCurveTo", x: 20, y: 23 })
    expect(command.path[9]).toEqual({ op: "closePath" })
  })

  it("matches Canvas roundRect corner assignment for negative dimensions", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 120, height: 80 }))
    const ctx = recorder.context

    ctx.beginPath()
    ctx.roundRect(90, 60, -80, -40, [2, 4, 6, 8])
    ctx.stroke()

    const command = recorder.snapshot().commands[0]
    expect(command?.op).toBe("strokePath")
    if (command?.op !== "strokePath") throw new Error("expected stroke path")
    expect(command.path[0]).toEqual({ op: "moveTo", x: 16, y: 20 })
    expect(command.path[1]).toEqual({ op: "lineTo", x: 82, y: 20 })
  })

  it("rejects invalid roundRect radii instead of approximating them", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    expect(() => ctx.roundRect(0, 0, 10, 10, -1)).toThrow(/cannot be negative/u)
    expect(() => ctx.roundRect(0, 0, 10, 10, [])).toThrow(/between one and four/u)
    expect(() => ctx.roundRect(0, 0, 10, 10, [1, 2, 3, 4, 5])).toThrow(/between one and four/u)
  })

  it("clears the retained command list only for a full backing-store clear", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 50 }))
    const ctx = recorder.context

    ctx.fillRect(0, 0, 10, 10)
    expect(() => ctx.clearRect(2, 2, 5, 5)).toThrow(/full backing store/u)
    ctx.clearRect(0, 0, 100, 50)

    expect(recorder.snapshot().commands).toEqual([])
  })

  it("does not treat a rotated clear bounding box as a full backing-store clear", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 20, 20)
    ctx.translate(50, 50)
    ctx.rotate(Math.PI / 4)

    expect(() => ctx.clearRect(-50, -50, 100, 100)).toThrow(/full backing store/u)
    expect(recorder.snapshot().commands).toHaveLength(1)
  })


  it("rejects fill and stroke settings the first native protocol cannot represent", () => {
    const fillRecorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const fillContext = fillRecorder.context
    fillContext.beginPath()
    fillContext.rect(0, 0, 10, 10)
    expect(() => fillContext.fill("evenodd")).toThrow(/nonzero fill rule/u)

    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10, 10)
    expect(() => ctx.stroke()).toThrow(/lineCap/u)

    ctx.lineCap = "butt"
    ctx.lineJoin = "round"
    expect(() => ctx.stroke()).toThrow(/lineJoin/u)

    ctx.lineJoin = "miter"
    ctx.miterLimit = 4
    expect(() => ctx.stroke()).toThrow(/miterLimit/u)
  })

  it("rejects transforms that GPUI cannot reproduce exactly for strokes and text", () => {
    const strokeRecorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const stroke = strokeRecorder.context
    stroke.scale(2, 1)
    stroke.beginPath()
    stroke.moveTo(0, 0)
    stroke.lineTo(10, 10)
    expect(() => stroke.stroke()).toThrow(/uniform scale transform/u)

    const rotatedTextRecorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const rotatedText = rotatedTextRecorder.context
    rotatedText.rotate(Math.PI / 4)
    expect(() => rotatedText.fillText("rotated", 10, 10)).toThrow(/positive uniform scale/u)

    const scaledTextRecorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const scaledText = scaledTextRecorder.context
    scaledText.translate(4, 6)
    scaledText.scale(2, 2)
    scaledText.fillText("scaled", 10, 12)
    expect(scaledTextRecorder.snapshot().commands[0]).toMatchObject({
      op: "fillText",
      x: 24,
      y: 30,
      fontSize: 20,
    })
  })

  it("rejects multiline and constrained fillText instead of mispainting it", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    const ctx = recorder.context

    expect(() => ctx.fillText("two\nlines", 0, 0)).toThrow(/newlines/u)
    expect(() => ctx.fillText("text", 0, 0, 20)).toThrow(/maxWidth/u)
  })

  it("bounds retained commands at opaque full-frame repaint boundaries", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 160, height: 80 }))
    const ctx = recorder.context

    ctx.fillStyle = "#09090b"
    ctx.fillRect(0, 0, 160, 80)
    ctx.fillStyle = "#ffffff"
    ctx.fillText("old frame", 12, 18)

    ctx.fillStyle = "rgb(9 9 11)"
    ctx.fillRect(0, 0, 160, 80)
    ctx.fillStyle = "#ffffff"
    ctx.fillText("fresh frame", 12, 18)

    const drawList = recorder.snapshot()
    expect(drawList.commands).toHaveLength(2)
    expect(JSON.stringify(drawList)).not.toContain("old frame")
    expect(JSON.stringify(drawList)).toContain("fresh frame")
  })

  it("does not prune prior commands for translucent full-frame fills", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 50 }))
    const ctx = recorder.context

    ctx.fillStyle = "#ffffff"
    ctx.fillText("underlay", 4, 12)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, 100, 50)

    expect(recorder.snapshot().commands).toHaveLength(2)
  })

  it("retains prior commands when full-frame paint opacity cannot be proven", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 50 }))
    const ctx = recorder.context

    ctx.fillStyle = "#ffffff"
    ctx.fillText("underlay", 4, 12)
    ctx.fillStyle = "not-a-color"
    ctx.fillRect(0, 0, 100, 50)

    expect(recorder.snapshot().commands).toHaveLength(2)
    expect(JSON.stringify(recorder.snapshot())).toContain("underlay")
  })

  it("returns snapshots that callers cannot mutate back into recorder state", () => {
    const recorder = createCanvas2DRecorder(() => ({ width: 100, height: 100 }))
    recorder.context.fillRect(0, 0, 5, 5)

    const first = recorder.snapshot()
    first.commands.length = 0

    expect(recorder.snapshot().commands).toHaveLength(1)
  })
})
