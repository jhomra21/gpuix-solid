export const CANVAS_DRAW_LIST_VERSION = 1 as const

export type CanvasDrawListVersion = typeof CANVAS_DRAW_LIST_VERSION
export type CanvasMatrix = readonly [number, number, number, number, number, number]

export type CanvasPathSegment =
  | { op: "moveTo"; x: number; y: number }
  | { op: "lineTo"; x: number; y: number }
  | { op: "quadraticCurveTo"; cpx: number; cpy: number; x: number; y: number }
  | {
      op: "bezierCurveTo"
      cp1x: number
      cp1y: number
      cp2x: number
      cp2y: number
      x: number
      y: number
    }
  | { op: "closePath" }

export type CanvasDrawCommand =
  | {
      op: "fillPath"
      color: string
      alpha: number
      fillRule: "nonzero" | "evenodd"
      path: CanvasPathSegment[]
    }
  | {
      op: "strokePath"
      color: string
      alpha: number
      lineWidth: number
      lineCap: CanvasLineCap
      lineJoin: CanvasLineJoin
      miterLimit: number
      path: CanvasPathSegment[]
    }
  | {
      op: "fillText"
      text: string
      x: number
      y: number
      color: string
      alpha: number
      fontSize: number
      fontFamily: string
      fontWeight?: number
      align: CanvasTextAlign
      baseline: CanvasTextBaseline
    }

export type CanvasDrawList = {
  version: CanvasDrawListVersion
  width: number
  height: number
  commands: CanvasDrawCommand[]
}

export type CanvasBackingSize = {
  width: number
  height: number
}

export type Canvas2DRecorder = {
  context: CanvasRenderingContext2D
  snapshot(): CanvasDrawList
  reset(): void
}

type ParsedFont = {
  size: number
  family: string
  weight?: number
}

type CanvasState = {
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  miterLimit: number
  globalAlpha: number
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  transform: CanvasMatrix
}

const IDENTITY: CanvasMatrix = [1, 0, 0, 1, 0, 0]

export function createCanvas2DRecorder(
  getSize: () => CanvasBackingSize,
  onChange: () => void = () => undefined,
): Canvas2DRecorder {
  let commands: CanvasDrawCommand[] = []
  let path: CanvasPathSegment[] = []
  let state = defaultState()
  const stack: CanvasState[] = []

  const changed = () => onChange()

  const context = {
    get fillStyle() {
      return state.fillStyle
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      state.fillStyle = stringPaint(value, "fillStyle")
    },
    get strokeStyle() {
      return state.strokeStyle
    },
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
      state.strokeStyle = stringPaint(value, "strokeStyle")
    },
    get lineWidth() {
      return state.lineWidth
    },
    set lineWidth(value: number) {
      if (Number.isFinite(value) && value > 0) state.lineWidth = value
    },
    get lineCap() {
      return state.lineCap
    },
    set lineCap(value: CanvasLineCap) {
      if (value === "butt" || value === "round" || value === "square") state.lineCap = value
    },
    get lineJoin() {
      return state.lineJoin
    },
    set lineJoin(value: CanvasLineJoin) {
      if (value === "bevel" || value === "round" || value === "miter") state.lineJoin = value
    },
    get miterLimit() {
      return state.miterLimit
    },
    set miterLimit(value: number) {
      if (Number.isFinite(value) && value > 0) state.miterLimit = value
    },
    get globalAlpha() {
      return state.globalAlpha
    },
    set globalAlpha(value: number) {
      if (Number.isFinite(value) && value >= 0 && value <= 1) state.globalAlpha = value
    },
    get font() {
      return state.font
    },
    set font(value: string) {
      parseFont(value)
      state.font = value
    },
    get textAlign() {
      return state.textAlign
    },
    set textAlign(value: CanvasTextAlign) {
      state.textAlign = value
    },
    get textBaseline() {
      return state.textBaseline
    },
    set textBaseline(value: CanvasTextBaseline) {
      state.textBaseline = value
    },

    save() {
      stack.push(cloneState(state))
    },
    restore() {
      const previous = stack.pop()
      if (previous) state = previous
    },
    resetTransform() {
      state.transform = IDENTITY
    },
    setTransform(
      a: number | DOMMatrix2DInit,
      b?: number,
      c?: number,
      d?: number,
      e?: number,
      f?: number,
    ) {
      if (typeof a === "object") {
        state.transform = matrixFromDomInit(a)
        return
      }
      state.transform = finiteMatrix(a, b, c, d, e, f)
    },
    transform(a: number, b: number, c: number, d: number, e: number, f: number) {
      state.transform = multiplyMatrices(state.transform, finiteMatrix(a, b, c, d, e, f))
    },
    translate(x: number, y: number) {
      state.transform = multiplyMatrices(state.transform, [1, 0, 0, 1, finite(x), finite(y)])
    },
    scale(x: number, y: number) {
      state.transform = multiplyMatrices(state.transform, [finite(x), 0, 0, finite(y), 0, 0])
    },
    rotate(angle: number) {
      const radians = finite(angle)
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      state.transform = multiplyMatrices(state.transform, [cosine, sine, -sine, cosine, 0, 0])
    },

    clearRect(x: number, y: number, width: number, height: number) {
      const points = rectanglePoints(x, y, width, height, state.transform)
      if (!coversBackingStore(points, getSize())) {
        throw new Error("GPUix Canvas2D v1 supports clearRect() only when it clears the full backing store")
      }
      commands = []
      path = []
      changed()
    },
    fillRect(x: number, y: number, width: number, height: number) {
      commands.push({
        op: "fillPath",
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fillRule: "nonzero",
        path: rectanglePath(x, y, width, height, state.transform),
      })
      changed()
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      commands.push({
        op: "strokePath",
        color: state.strokeStyle,
        alpha: state.globalAlpha,
        lineWidth: transformedLineWidth(state.lineWidth, state.transform),
        lineCap: state.lineCap,
        lineJoin: state.lineJoin,
        miterLimit: state.miterLimit,
        path: rectanglePath(x, y, width, height, state.transform),
      })
      changed()
    },

    beginPath() {
      path = []
    },
    closePath() {
      path.push({ op: "closePath" })
    },
    moveTo(x: number, y: number) {
      const point = transformPoint(x, y, state.transform)
      path.push({ op: "moveTo", x: point[0], y: point[1] })
    },
    lineTo(x: number, y: number) {
      const point = transformPoint(x, y, state.transform)
      path.push({ op: "lineTo", x: point[0], y: point[1] })
    },
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
      const control = transformPoint(cpx, cpy, state.transform)
      const point = transformPoint(x, y, state.transform)
      path.push({
        op: "quadraticCurveTo",
        cpx: control[0],
        cpy: control[1],
        x: point[0],
        y: point[1],
      })
    },
    bezierCurveTo(
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number,
    ) {
      const control1 = transformPoint(cp1x, cp1y, state.transform)
      const control2 = transformPoint(cp2x, cp2y, state.transform)
      const point = transformPoint(x, y, state.transform)
      path.push({
        op: "bezierCurveTo",
        cp1x: control1[0],
        cp1y: control1[1],
        cp2x: control2[0],
        cp2y: control2[1],
        x: point[0],
        y: point[1],
      })
    },
    rect(x: number, y: number, width: number, height: number) {
      path.push(...rectanglePath(x, y, width, height, state.transform))
    },
    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise = false,
    ) {
      appendArc(path, x, y, radius, startAngle, endAngle, counterclockwise, state.transform)
    },
    fill(fillRule: CanvasFillRule = "nonzero") {
      if (path.length === 0) return
      commands.push({
        op: "fillPath",
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fillRule,
        path: clonePath(path),
      })
      changed()
    },
    stroke() {
      if (path.length === 0) return
      commands.push({
        op: "strokePath",
        color: state.strokeStyle,
        alpha: state.globalAlpha,
        lineWidth: transformedLineWidth(state.lineWidth, state.transform),
        lineCap: state.lineCap,
        lineJoin: state.lineJoin,
        miterLimit: state.miterLimit,
        path: clonePath(path),
      })
      changed()
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      if (maxWidth !== undefined) {
        throw new Error("GPUix Canvas2D v1 does not support fillText() maxWidth")
      }
      const point = transformPoint(x, y, state.transform)
      const font = parseFont(state.font)
      commands.push({
        op: "fillText",
        text: String(text),
        x: point[0],
        y: point[1],
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fontSize: font.size * textScale(state.transform),
        fontFamily: font.family,
        ...(font.weight === undefined ? {} : { fontWeight: font.weight }),
        align: state.textAlign,
        baseline: state.textBaseline,
      })
      changed()
    },
  } as unknown as CanvasRenderingContext2D

  return {
    context,
    snapshot() {
      const size = normalizeSize(getSize())
      return {
        version: CANVAS_DRAW_LIST_VERSION,
        width: size.width,
        height: size.height,
        commands: commands.map(cloneCommand),
      }
    },
    reset() {
      commands = []
      path = []
      state = defaultState()
      stack.length = 0
      changed()
    },
  }
}

function defaultState(): CanvasState {
  return {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    miterLimit: 10,
    globalAlpha: 1,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    transform: IDENTITY,
  }
}

function cloneState(state: CanvasState): CanvasState {
  return { ...state, transform: [...state.transform] as CanvasMatrix }
}

function clonePath(path: readonly CanvasPathSegment[]): CanvasPathSegment[] {
  return path.map((segment) => ({ ...segment }))
}

function cloneCommand(command: CanvasDrawCommand): CanvasDrawCommand {
  return command.op === "fillText"
    ? { ...command }
    : { ...command, path: clonePath(command.path) }
}

function rectanglePath(
  x: number,
  y: number,
  width: number,
  height: number,
  matrix: CanvasMatrix,
): CanvasPathSegment[] {
  const points = rectanglePoints(x, y, width, height, matrix)
  return [
    { op: "moveTo", x: points[0][0], y: points[0][1] },
    { op: "lineTo", x: points[1][0], y: points[1][1] },
    { op: "lineTo", x: points[2][0], y: points[2][1] },
    { op: "lineTo", x: points[3][0], y: points[3][1] },
    { op: "closePath" },
  ]
}

function rectanglePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  matrix: CanvasMatrix,
): readonly (readonly [number, number])[] {
  return [
    transformPoint(x, y, matrix),
    transformPoint(x + width, y, matrix),
    transformPoint(x + width, y + height, matrix),
    transformPoint(x, y + height, matrix),
  ]
}

function appendArc(
  path: CanvasPathSegment[],
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
  matrix: CanvasMatrix,
): void {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new DOMException("The radius provided is negative.", "IndexSizeError")
  }
  if (radius === 0) return

  let start = finite(startAngle)
  let end = finite(endAngle)
  const full = Math.PI * 2
  if (!counterclockwise) {
    while (end < start) end += full
    end = Math.min(end, start + full)
  } else {
    while (end > start) end -= full
    end = Math.max(end, start - full)
  }

  const sweep = end - start
  if (Math.abs(sweep) < Number.EPSILON) return
  const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)))
  const step = sweep / segments
  const startPoint = transformPoint(x + Math.cos(start) * radius, y + Math.sin(start) * radius, matrix)

  if (path.length === 0) {
    path.push({ op: "moveTo", x: startPoint[0], y: startPoint[1] })
  } else {
    path.push({ op: "lineTo", x: startPoint[0], y: startPoint[1] })
  }

  for (let index = 0; index < segments; index += 1) {
    const a0 = start + step * index
    const a1 = a0 + step
    const k = (4 / 3) * Math.tan((a1 - a0) / 4)
    const cp1 = transformPoint(
      x + radius * (Math.cos(a0) - k * Math.sin(a0)),
      y + radius * (Math.sin(a0) + k * Math.cos(a0)),
      matrix,
    )
    const cp2 = transformPoint(
      x + radius * (Math.cos(a1) + k * Math.sin(a1)),
      y + radius * (Math.sin(a1) - k * Math.cos(a1)),
      matrix,
    )
    const point = transformPoint(x + radius * Math.cos(a1), y + radius * Math.sin(a1), matrix)
    path.push({
      op: "bezierCurveTo",
      cp1x: cp1[0],
      cp1y: cp1[1],
      cp2x: cp2[0],
      cp2y: cp2[1],
      x: point[0],
      y: point[1],
    })
  }
}

function transformPoint(x: number, y: number, matrix: CanvasMatrix): readonly [number, number] {
  const [a, b, c, d, e, f] = matrix
  return [a * finite(x) + c * finite(y) + e, b * finite(x) + d * finite(y) + f]
}

function multiplyMatrices(left: CanvasMatrix, right: CanvasMatrix): CanvasMatrix {
  const [a1, b1, c1, d1, e1, f1] = left
  const [a2, b2, c2, d2, e2, f2] = right
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}

function finiteMatrix(
  a: number,
  b: number | undefined,
  c: number | undefined,
  d: number | undefined,
  e: number | undefined,
  f: number | undefined,
): CanvasMatrix {
  if ([a, b, c, d, e, f].some((value) => value === undefined || !Number.isFinite(value))) {
    throw new TypeError("Canvas transform values must be finite numbers")
  }
  return [a, b!, c!, d!, e!, f!]
}

function matrixFromDomInit(value: DOMMatrix2DInit): CanvasMatrix {
  return finiteMatrix(
    value.a ?? value.m11 ?? 1,
    value.b ?? value.m12 ?? 0,
    value.c ?? value.m21 ?? 0,
    value.d ?? value.m22 ?? 1,
    value.e ?? value.m41 ?? 0,
    value.f ?? value.m42 ?? 0,
  )
}

function transformedLineWidth(width: number, matrix: CanvasMatrix): number {
  const [a, b, c, d] = matrix
  const scaleX = Math.hypot(a, b)
  const scaleY = Math.hypot(c, d)
  return finite(width) * Math.max(0.0001, (scaleX + scaleY) / 2)
}

function textScale(matrix: CanvasMatrix): number {
  const [a, b, c, d] = matrix
  return Math.max(0.0001, (Math.hypot(a, b) + Math.hypot(c, d)) / 2)
}

function coversBackingStore(
  points: readonly (readonly [number, number])[],
  size: CanvasBackingSize,
): boolean {
  const normalized = normalizeSize(size)
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const epsilon = 0.01
  return Math.min(...xs) <= epsilon &&
    Math.min(...ys) <= epsilon &&
    Math.max(...xs) >= normalized.width - epsilon &&
    Math.max(...ys) >= normalized.height - epsilon
}

function normalizeSize(size: CanvasBackingSize): CanvasBackingSize {
  return {
    width: positive(size.width, 300),
    height: positive(size.height, 150),
  }
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError("Canvas coordinate must be a finite number")
  return value
}

function stringPaint(value: string | CanvasGradient | CanvasPattern, property: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`GPUix Canvas2D v1 supports string ${property} values only`)
  }
  return value
}

function parseFont(value: string): ParsedFont {
  const match = value.trim().match(/^(?:(normal|bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/)
  if (!match) {
    throw new TypeError(`GPUix Canvas2D v1 cannot represent font ${JSON.stringify(value)}`)
  }
  const size = Number(match[2])
  const family = match[3]?.trim()
  if (!Number.isFinite(size) || size <= 0 || !family) {
    throw new TypeError(`GPUix Canvas2D v1 cannot represent font ${JSON.stringify(value)}`)
  }
  const token = match[1]
  const weight = token === "bold"
    ? 700
    : token && token !== "normal"
      ? Number(token)
      : undefined
  return { size, family, weight }
}
