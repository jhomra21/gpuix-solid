import type { CanvasPathSegment } from "./canvas.js"

type PathToken =
  | { kind: "command"; value: string }
  | { kind: "number"; value: number }

export class GpuixPath2D {
  readonly segments: CanvasPathSegment[]

  constructor(source?: string | GpuixPath2D) {
    if (source instanceof GpuixPath2D) {
      this.segments = source.segments.map((segment) => ({ ...segment }))
      return
    }
    this.segments = source === undefined ? [] : parseSvgPath(source)
  }

  addPath(path: GpuixPath2D): void {
    this.segments.push(...path.segments.map((segment) => ({ ...segment })))
  }
}

function parseSvgPath(source: string): CanvasPathSegment[] {
  const tokens = tokenize(source)
  const segments: CanvasPathSegment[] = []
  let index = 0
  let command = ""
  let currentX = 0
  let currentY = 0
  let subpathX = 0
  let subpathY = 0

  const hasNumber = () => tokens[index]?.kind === "number"
  const number = (): number => {
    const token = tokens[index]
    if (!token || token.kind !== "number") {
      throw new TypeError("GPUix Path2D expected a numeric SVG path argument")
    }
    index += 1
    return token.value
  }

  while (index < tokens.length) {
    const token = tokens[index]
    if (!token) break
    if (token.kind === "command") {
      command = token.value
      index += 1
    } else if (!command) {
      throw new TypeError("GPUix Path2D SVG data must start with a command")
    }

    const relative = command === command.toLowerCase()
    switch (command.toUpperCase()) {
      case "M": {
        let first = true
        while (hasNumber()) {
          const rawX = number()
          const rawY = number()
          const x = relative ? currentX + rawX : rawX
          const y = relative ? currentY + rawY : rawY
          if (first) {
            segments.push({ op: "moveTo", x, y })
            subpathX = x
            subpathY = y
            first = false
          } else {
            segments.push({ op: "lineTo", x, y })
          }
          currentX = x
          currentY = y
        }
        if (first) throw new TypeError("GPUix Path2D move command requires coordinates")
        command = relative ? "l" : "L"
        break
      }
      case "L": {
        let consumed = false
        while (hasNumber()) {
          const rawX = number()
          const rawY = number()
          currentX = relative ? currentX + rawX : rawX
          currentY = relative ? currentY + rawY : rawY
          segments.push({ op: "lineTo", x: currentX, y: currentY })
          consumed = true
        }
        if (!consumed) throw new TypeError("GPUix Path2D line command requires coordinates")
        break
      }
      case "H": {
        let consumed = false
        while (hasNumber()) {
          const rawX = number()
          currentX = relative ? currentX + rawX : rawX
          segments.push({ op: "lineTo", x: currentX, y: currentY })
          consumed = true
        }
        if (!consumed) throw new TypeError("GPUix Path2D horizontal line command requires coordinates")
        break
      }
      case "V": {
        let consumed = false
        while (hasNumber()) {
          const rawY = number()
          currentY = relative ? currentY + rawY : rawY
          segments.push({ op: "lineTo", x: currentX, y: currentY })
          consumed = true
        }
        if (!consumed) throw new TypeError("GPUix Path2D vertical line command requires coordinates")
        break
      }
      case "Q": {
        let consumed = false
        while (hasNumber()) {
          const rawCpx = number()
          const rawCpy = number()
          const rawX = number()
          const rawY = number()
          const cpx = relative ? currentX + rawCpx : rawCpx
          const cpy = relative ? currentY + rawCpy : rawCpy
          const x = relative ? currentX + rawX : rawX
          const y = relative ? currentY + rawY : rawY
          segments.push({ op: "quadraticCurveTo", cpx, cpy, x, y })
          currentX = x
          currentY = y
          consumed = true
        }
        if (!consumed) throw new TypeError("GPUix Path2D quadratic command requires coordinates")
        break
      }
      case "C": {
        let consumed = false
        while (hasNumber()) {
          const rawCp1x = number()
          const rawCp1y = number()
          const rawCp2x = number()
          const rawCp2y = number()
          const rawX = number()
          const rawY = number()
          const cp1x = relative ? currentX + rawCp1x : rawCp1x
          const cp1y = relative ? currentY + rawCp1y : rawCp1y
          const cp2x = relative ? currentX + rawCp2x : rawCp2x
          const cp2y = relative ? currentY + rawCp2y : rawCp2y
          const x = relative ? currentX + rawX : rawX
          const y = relative ? currentY + rawY : rawY
          segments.push({ op: "bezierCurveTo", cp1x, cp1y, cp2x, cp2y, x, y })
          currentX = x
          currentY = y
          consumed = true
        }
        if (!consumed) throw new TypeError("GPUix Path2D cubic command requires coordinates")
        break
      }
      case "Z":
        segments.push({ op: "closePath" })
        currentX = subpathX
        currentY = subpathY
        command = ""
        break
      default:
        throw new TypeError(`GPUix Path2D does not support SVG command ${JSON.stringify(command)}`)
    }
  }

  return segments
}

function tokenize(source: string): PathToken[] {
  const tokens: PathToken[] = []
  const pattern = /([A-Za-z])|([-+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][-+]?\d+)?)/g
  let cursor = 0

  for (const match of source.matchAll(pattern)) {
    const start = match.index
    if (source.slice(cursor, start).replace(/[\s,]/g, "") !== "") {
      throw new TypeError("GPUix Path2D received invalid SVG path data")
    }
    cursor = start + match[0].length

    if (match[1]) {
      tokens.push({ kind: "command", value: match[1] })
      continue
    }

    const value = Number(match[2])
    if (!Number.isFinite(value)) {
      throw new TypeError("GPUix Path2D received a non-finite SVG path number")
    }
    tokens.push({ kind: "number", value })
  }

  if (source.slice(cursor).replace(/[\s,]/g, "") !== "") {
    throw new TypeError("GPUix Path2D received invalid trailing SVG path data")
  }

  return tokens
}
