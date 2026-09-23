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
  measureTextNative?: (
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: number,
  ) => number,
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
      a: number,
      b?: number,
      c?: number,
      d?: number,
      e?: number,
      f?: number,
    ) {
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
      const points = rectanglePoints(x, y, width, height, state.transform)
      if (
        state.globalAlpha >= 1 &&
        isOpaquePaint(state.fillStyle) &&
        isFullBackingStoreRectangle(points, getSize())
      ) {
        commands = []
        path = []
      }
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
      assertSupportedStrokeState(state)
      assertSimilarityTransform(state.transform, "strokeRect()")
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
    roundRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radii: number | readonly number[] = 0,
    ) {
      path.push(...roundedRectanglePath(x, y, width, height, radii, state.transform))
    },
    fill(fillRule: CanvasFillRule = "nonzero") {
      if (fillRule !== "nonzero") {
        throw new Error("GPUix Canvas2D v1 supports the nonzero fill rule only")
      }
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
      assertSupportedStrokeState(state)
      assertSimilarityTransform(state.transform, "stroke()")
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
    measureText(text: string) {
      if (!measureTextNative) {
        throw new Error("GPUix Canvas2D measureText() requires native text measurement support")
      }
      const font = parseFont(state.font)
      const width = measureTextNative(
        String(text),
        font.size * textScale(state.transform),
        font.family,
        font.weight ?? 400,
      )
      if (!Number.isFinite(width) || width < 0) {
        throw new Error(`GPUix native text measurement returned invalid width ${width}`)
      }
      return { width }
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      if (maxWidth !== undefined) {
        throw new Error("GPUix Canvas2D v1 does not support fillText() maxWidth")
      }
      if (String(text).includes("\n")) {
        throw new Error("GPUix Canvas2D v1 does not support newlines in fillText()")
      }
      assertTextTransform(state.transform)
      const point = transformPoint(x, y, state.transform)
      const font = parseFont(state.font)
      const command: Extract<CanvasDrawCommand, { op: "fillText" }> = {
        op: "fillText",
        text: String(text),
        x: point[0],
        y: point[1],
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fontSize: font.size * textScale(state.transform),
        fontFamily: font.family,
        align: state.textAlign,
        baseline: state.textBaseline,
      }
      if (font.weight !== undefined) command.fontWeight = font.weight
      commands.push(command)
      changed()
    },
  }
  // SAFETY: this host object deliberately implements the Canvas2D subset supported by protocol v1.
  // Browser-compiled source still sees the standard CanvasRenderingContext2D contract; unsupported
  // operations are absent or fail closed rather than being serialized incorrectly.
  const canvasContext = context as CanvasRenderingContext2D

  return {
    context: canvasContext,
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

function assertSimilarityTransform(matrix: CanvasMatrix, operation: string): void {
  const [a, b, c, d] = matrix
  const scaleX = Math.hypot(a, b)
  const scaleY = Math.hypot(c, d)
  const scaleTolerance = Math.max(1, scaleX, scaleY) * 1e-6
  const orthogonalTolerance = Math.max(1, scaleX * scaleY) * 1e-6
  if (
    scaleX <= Number.EPSILON ||
    scaleY <= Number.EPSILON ||
    Math.abs(scaleX - scaleY) > scaleTolerance ||
    Math.abs(a * c + b * d) > orthogonalTolerance
  ) {
    throw new Error(`GPUix Canvas2D v1 requires a rotation/reflection + uniform scale transform for ${operation}`)
  }
}

function assertTextTransform(matrix: CanvasMatrix): void {
  const [a, b, c, d] = matrix
  const tolerance = Math.max(1, Math.abs(a), Math.abs(d)) * 1e-6
  if (
    a <= Number.EPSILON ||
    d <= Number.EPSILON ||
    Math.abs(a - d) > tolerance ||
    Math.abs(b) > tolerance ||
    Math.abs(c) > tolerance
  ) {
    throw new Error("GPUix Canvas2D v1 requires translation + positive uniform scale for fillText()")
  }
}

function assertSupportedStrokeState(state: CanvasState): void {
  if (state.lineCap !== "butt") {
    throw new Error(`GPUix Canvas2D v1 does not support lineCap=${JSON.stringify(state.lineCap)}`)
  }
  if (state.lineJoin !== "miter") {
    throw new Error(`GPUix Canvas2D v1 does not support lineJoin=${JSON.stringify(state.lineJoin)}`)
  }
  if (state.miterLimit !== 10) {
    throw new Error(`GPUix Canvas2D v1 does not support miterLimit=${state.miterLimit}`)
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
  return { ...state, transform: cloneMatrix(state.transform) }
}

function cloneMatrix(matrix: CanvasMatrix): CanvasMatrix {
  return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
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
  const first = points[0]!
  const second = points[1]!
  const third = points[2]!
  const fourth = points[3]!
  return [
    { op: "moveTo", x: first[0], y: first[1] },
    { op: "lineTo", x: second[0], y: second[1] },
    { op: "lineTo", x: third[0], y: third[1] },
    { op: "lineTo", x: fourth[0], y: fourth[1] },
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

function roundedRectanglePath(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: number | readonly number[],
  matrix: CanvasMatrix,
): CanvasPathSegment[] {
  const rawX = finite(x)
  const rawY = finite(y)
  const rawWidth = finite(width)
  const rawHeight = finite(height)
  const left = rawWidth >= 0 ? rawX : rawX + rawWidth
  const top = rawHeight >= 0 ? rawY : rawY + rawHeight
  const boxWidth = Math.abs(rawWidth)
  const boxHeight = Math.abs(rawHeight)

  let [topLeft, topRight, bottomRight, bottomLeft] = normalizeRoundRectRadii(radii)

  if (rawWidth < 0) {
    ;[topLeft, topRight, bottomRight, bottomLeft] = [topRight, topLeft, bottomLeft, bottomRight]
  }
  if (rawHeight < 0) {
    ;[topLeft, topRight, bottomRight, bottomLeft] = [bottomLeft, bottomRight, topRight, topLeft]
  }

  const scale = Math.min(
    1,
    cornerScale(boxWidth, topLeft + topRight),
    cornerScale(boxHeight, topRight + bottomRight),
    cornerScale(boxWidth, bottomRight + bottomLeft),
    cornerScale(boxHeight, bottomLeft + topLeft),
  )
  topLeft *= scale
  topRight *= scale
  bottomRight *= scale
  bottomLeft *= scale

  const right = left + boxWidth
  const bottom = top + boxHeight
  const path: CanvasPathSegment[] = []

  const move = (px: number, py: number) => {
    const point = transformPoint(px, py, matrix)
    path.push({ op: "moveTo", x: point[0], y: point[1] })
  }
  const line = (px: number, py: number) => {
    const point = transformPoint(px, py, matrix)
    path.push({ op: "lineTo", x: point[0], y: point[1] })
  }
  const curve = (
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    px: number,
    py: number,
  ) => {
    const control1 = transformPoint(cp1x, cp1y, matrix)
    const control2 = transformPoint(cp2x, cp2y, matrix)
    const point = transformPoint(px, py, matrix)
    path.push({
      op: "bezierCurveTo",
      cp1x: control1[0],
      cp1y: control1[1],
      cp2x: control2[0],
      cp2y: control2[1],
      x: point[0],
      y: point[1],
    })
  }

  const kappa = 0.5522847498307936
  move(left + topLeft, top)
  line(right - topRight, top)
  if (topRight > 0) {
    curve(
      right - topRight + topRight * kappa,
      top,
      right,
      top + topRight - topRight * kappa,
      right,
      top + topRight,
    )
  } else {
    line(right, top)
  }

  line(right, bottom - bottomRight)
  if (bottomRight > 0) {
    curve(
      right,
      bottom - bottomRight + bottomRight * kappa,
      right - bottomRight + bottomRight * kappa,
      bottom,
      right - bottomRight,
      bottom,
    )
  } else {
    line(right, bottom)
  }

  line(left + bottomLeft, bottom)
  if (bottomLeft > 0) {
    curve(
      left + bottomLeft - bottomLeft * kappa,
      bottom,
      left,
      bottom - bottomLeft + bottomLeft * kappa,
      left,
      bottom - bottomLeft,
    )
  } else {
    line(left, bottom)
  }

  line(left, top + topLeft)
  if (topLeft > 0) {
    curve(
      left,
      top + topLeft - topLeft * kappa,
      left + topLeft - topLeft * kappa,
      top,
      left + topLeft,
      top,
    )
  } else {
    line(left, top)
  }

  path.push({ op: "closePath" })
  return path
}

function normalizeRoundRectRadii(
  radii: number | readonly number[],
): [number, number, number, number] {
  const values = typeof radii === "number"
    ? [radii]
    : Array.isArray(radii)
      ? [...radii]
      : (() => {
          throw new TypeError("GPUix Canvas2D roundRect() currently supports numeric radii only")
        })()

  if (values.length < 1 || values.length > 4) {
    throw new RangeError("Canvas roundRect() radii must contain between one and four values")
  }

  const normalized = values.map((value) => {
    const radius = finite(value)
    if (radius < 0) throw new RangeError("Canvas roundRect() radii cannot be negative")
    return radius
  })

  if (normalized.length === 1) {
    const value = normalized[0]!
    return [value, value, value, value]
  }
  if (normalized.length === 2) {
    return [normalized[0]!, normalized[1]!, normalized[0]!, normalized[1]!]
  }
  if (normalized.length === 3) {
    return [normalized[0]!, normalized[1]!, normalized[2]!, normalized[1]!]
  }
  return [normalized[0]!, normalized[1]!, normalized[2]!, normalized[3]!]
}

function cornerScale(edge: number, radii: number): number {
  return radii > 0 ? edge / radii : 1
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
  if (
    !Number.isFinite(a) ||
    b === undefined || !Number.isFinite(b) ||
    c === undefined || !Number.isFinite(c) ||
    d === undefined || !Number.isFinite(d) ||
    e === undefined || !Number.isFinite(e) ||
    f === undefined || !Number.isFinite(f)
  ) {
    throw new TypeError("GPUix Canvas2D v1 supports only the six-number setTransform() overload")
  }
  return [a, b, c, d, e, f]
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
  if (points.length !== 4) return false
  const normalized = normalizeSize(size)
  const corners: readonly (readonly [number, number])[] = [
    [0, 0],
    [normalized.width, 0],
    [normalized.width, normalized.height],
    [0, normalized.height],
  ]
  return corners.every((corner) => convexPolygonContainsPoint(points, corner))
}

function convexPolygonContainsPoint(
  polygon: readonly (readonly [number, number])[],
  point: readonly [number, number],
): boolean {
  const scale = Math.max(
    1,
    Math.abs(point[0]),
    Math.abs(point[1]),
    ...polygon.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]),
  )
  const tolerance = scale * scale * 1e-9
  let direction = 0

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    if (!start || !end) return false
    const cross =
      (end[0] - start[0]) * (point[1] - start[1]) -
      (end[1] - start[1]) * (point[0] - start[0])
    if (Math.abs(cross) <= tolerance) continue
    const nextDirection = Math.sign(cross)
    if (direction !== 0 && nextDirection !== direction) return false
    direction = nextDirection
  }

  return direction !== 0
}

function isFullBackingStoreRectangle(
  points: readonly (readonly [number, number])[],
  size: CanvasBackingSize,
): boolean {
  if (points.length !== 4) return false
  const normalized = normalizeSize(size)
  const targets: readonly (readonly [number, number])[] = [
    [0, 0],
    [normalized.width, 0],
    [normalized.width, normalized.height],
    [0, normalized.height],
  ]
  const epsilon = 0.01
  const near = (
    point: readonly [number, number],
    target: readonly [number, number],
  ) => Math.abs(point[0] - target[0]) <= epsilon && Math.abs(point[1] - target[1]) <= epsilon
  return targets.every((target) => points.some((point) => near(point, target))) &&
    points.every((point) => targets.some((target) => near(point, target)))
}

function isOpaquePaint(value: string): boolean {
  const paint = value.trim().toLowerCase()
  if (!paint || paint === "transparent") return false

  const hex = paint.match(/^#([0-9a-f]+)$/i)?.[1]
  if (hex) {
    if (hex.length === 3 || hex.length === 6) return true
    if (hex.length === 4) return hex[3] === "f"
    if (hex.length === 8) return hex.slice(6) === "ff"
    return false
  }

  const rgb = paint.match(/^rgba?\((.*)\)$/)?.[1]
  if (rgb === undefined) return false
  const commaSeparated = rgb.includes(",")
  const slashParts = rgb.split("/")
  if (slashParts.length > 2) return false

  let channels: string[]
  let alpha: string | undefined
  if (commaSeparated) {
    if (slashParts.length !== 1) return false
    const parts = rgb.split(",").map((part) => part.trim())
    if (parts.length !== 3 && parts.length !== 4) return false
    channels = parts.slice(0, 3)
    alpha = parts[3]
  } else {
    channels = (slashParts[0] ?? "").trim().split(/\s+/u)
    if (channels.length !== 3) return false
    alpha = slashParts[1]?.trim()
  }

  if (!channels.every(isFiniteCssNumber)) return false
  if (alpha === undefined) return true
  const parsedAlpha = parseCssAlpha(alpha)
  return parsedAlpha !== undefined && parsedAlpha >= 1
}

function isFiniteCssNumber(value: string): boolean {
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(%)?$/i)
  return match !== null && Number.isFinite(Number(match[1]))
}

function parseCssAlpha(value: string): number | undefined {
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(%)?$/i)
  if (!match) return undefined
  const number = Number(match[1])
  if (!Number.isFinite(number)) return undefined
  return match[2] ? number / 100 : number
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
  const serialized = String(value)
  if (value !== serialized) {
    throw new TypeError(`GPUix Canvas2D v1 supports string ${property} values only`)
  }
  return serialized
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
  return weight === undefined ? { size, family } : { size, family, weight }
}
