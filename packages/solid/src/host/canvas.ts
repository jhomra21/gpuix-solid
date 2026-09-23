export const CANVAS_DRAW_LIST_VERSION = 3 as const

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

export type CanvasClipRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasImageRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasImagePixels = {
  width: number
  height: number
  pixels: Uint8Array
}

type CanvasCommandClip = {
  clip?: CanvasClipRect
}

export type CanvasDrawCommand = (
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
  | {
      op: "drawImage"
      imageId: number
      source: CanvasImageRect
      destination: CanvasImageRect
      alpha: number
    }
) & CanvasCommandClip

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
  clip: CanvasClipRect | null
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
  uploadImageNative?: (
    imageId: number,
    source: CanvasImagePixels,
  ) => void,
): Canvas2DRecorder {
  let commands: CanvasDrawCommand[] = []
  let path: CanvasPathSegment[] = []
  let state = defaultState()
  const stack: CanvasState[] = []
  const imageIds = new WeakMap<CanvasImageSource, number>()
  let nextImageId = 1

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
        throw new Error("GPUix Canvas2D v3 supports clearRect() only when it clears the full backing store")
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
      commands.push(withCanvasClip({
        op: "fillPath",
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fillRule: "nonzero",
        path: rectanglePath(x, y, width, height, state.transform),
      }, state.clip))
      changed()
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      assertSupportedStrokeState(state)
      assertSimilarityTransform(state.transform, "strokeRect()")
      commands.push(withCanvasClip({
        op: "strokePath",
        color: state.strokeStyle,
        alpha: state.globalAlpha,
        lineWidth: transformedLineWidth(state.lineWidth, state.transform),
        lineCap: state.lineCap,
        lineJoin: state.lineJoin,
        miterLimit: state.miterLimit,
        path: rectanglePath(x, y, width, height, state.transform),
      }, state.clip))
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
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
      appendArcTo(path, x1, y1, x2, y2, radius, state.transform)
    },
    roundRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radii: number | number[] = 0,
    ) {
      path.push(...roundedRectanglePath(x, y, width, height, radii, state.transform))
    },
    clip(fillRule: CanvasFillRule = "nonzero") {
      if (fillRule !== "nonzero") {
        throw new Error("GPUix Canvas2D v3 supports the nonzero clip rule only")
      }
      const nextClip = rectangularClipFromPath(path)
      if (!nextClip) {
        throw new Error("GPUix Canvas2D v3 supports clip() only for one axis-aligned rectangular path")
      }
      state.clip = intersectClipRects(state.clip, nextClip)
    },
    fill(fillRule: CanvasFillRule = "nonzero") {
      if (fillRule !== "nonzero") {
        throw new Error("GPUix Canvas2D v3 supports the nonzero fill rule only")
      }
      if (path.length === 0) return
      commands.push(withCanvasClip({
        op: "fillPath",
        color: state.fillStyle,
        alpha: state.globalAlpha,
        fillRule,
        path: clonePath(path),
      }, state.clip))
      changed()
    },
    stroke() {
      if (path.length === 0) return
      assertSupportedStrokeState(state)
      assertSimilarityTransform(state.transform, "stroke()")
      commands.push(withCanvasClip({
        op: "strokePath",
        color: state.strokeStyle,
        alpha: state.globalAlpha,
        lineWidth: transformedLineWidth(state.lineWidth, state.transform),
        lineCap: state.lineCap,
        lineJoin: state.lineJoin,
        miterLimit: state.miterLimit,
        path: clonePath(path),
      }, state.clip))
      changed()
    },
    measureText(text: string) {
      if (!measureTextNative) {
        throw new Error("GPUix Canvas2D measureText() requires native text measurement support")
      }
      const font = parseFont(state.font)
      const width = measureTextNative(
        String(text),
        font.size,
        font.family,
        font.weight ?? 400,
      )
      if (!Number.isFinite(width) || width < 0) {
        throw new Error(`GPUix native text measurement returned invalid width ${width}`)
      }
      return { width }
    },
    drawImage(image: CanvasImageSource, ...args: number[]) {
      if (!uploadImageNative) {
        throw new Error("GPUix Canvas2D drawImage() requires native image upload support")
      }
      const pixels = readCanvasImagePixels(image)
      const rectangles = resolveDrawImageRectangles(pixels.width, pixels.height, args)
      if (!rectangles) return
      const destination = transformImageRect(rectangles.destination, state.transform)
      let imageId = imageIds.get(image)
      if (imageId === undefined) {
        imageId = nextImageId
        nextImageId += 1
        imageIds.set(image, imageId)
      }
      uploadImageNative(imageId, pixels)
      commands.push(withCanvasClip({
        op: "drawImage",
        imageId,
        source: rectangles.source,
        destination,
        alpha: state.globalAlpha,
      }, state.clip))
      changed()
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      if (maxWidth !== undefined) {
        throw new Error("GPUix Canvas2D v3 does not support fillText() maxWidth")
      }
      if (String(text).includes("\n")) {
        throw new Error("GPUix Canvas2D v3 does not support newlines in fillText()")
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
      commands.push(withCanvasClip(command, state.clip))
      changed()
    },
  }
  // SAFETY: this host object deliberately implements the Canvas2D subset supported by protocol v3.
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
    throw new Error(`GPUix Canvas2D v3 requires a rotation/reflection + uniform scale transform for ${operation}`)
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
    throw new Error("GPUix Canvas2D v3 requires translation + positive uniform scale for fillText()")
  }
}

function assertSupportedStrokeState(state: CanvasState): void {
  if (state.lineCap !== "butt") {
    throw new Error(`GPUix Canvas2D v3 does not support lineCap=${JSON.stringify(state.lineCap)}`)
  }
  if (state.lineJoin !== "miter") {
    throw new Error(`GPUix Canvas2D v3 does not support lineJoin=${JSON.stringify(state.lineJoin)}`)
  }
  if (state.miterLimit !== 10) {
    throw new Error(`GPUix Canvas2D v3 does not support miterLimit=${state.miterLimit}`)
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
    clip: null,
  }
}

function cloneState(state: CanvasState): CanvasState {
  return {
    ...state,
    transform: cloneMatrix(state.transform),
    clip: state.clip ? { ...state.clip } : null,
  }
}

function cloneMatrix(matrix: CanvasMatrix): CanvasMatrix {
  return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
}

function clonePath(path: readonly CanvasPathSegment[]): CanvasPathSegment[] {
  return path.map((segment) => ({ ...segment }))
}

function cloneCommand(command: CanvasDrawCommand): CanvasDrawCommand {
  let clone: CanvasDrawCommand
  if (command.op === "fillText") {
    clone = { ...command }
  } else if (command.op === "drawImage") {
    clone = {
      ...command,
      source: { ...command.source },
      destination: { ...command.destination },
    }
  } else {
    clone = { ...command, path: clonePath(command.path) }
  }
  if (command.clip) clone.clip = { ...command.clip }
  return clone
}

function readCanvasImagePixels(image: CanvasImageSource): CanvasImagePixels {
  if (!("getContext" in image)) {
    throw new TypeError(
      "GPUix Canvas2D drawImage() currently supports canvas-like sources with readable RGBA pixels",
    )
  }
  const width = Number(image.width)
  const height = Number(image.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new DOMException("The image source has no usable dimensions.", "InvalidStateError")
  }
  const integerWidth = Math.floor(width)
  const integerHeight = Math.floor(height)
  const context = image.getContext("2d")
  if (!context) {
    throw new TypeError("GPUix Canvas2D drawImage() could not read the source Canvas2D context")
  }
  const data = context.getImageData(0, 0, integerWidth, integerHeight).data
  return {
    width: integerWidth,
    height: integerHeight,
    pixels: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  }
}

function resolveDrawImageRectangles(
  imageWidth: number,
  imageHeight: number,
  args: readonly number[],
): { source: CanvasImageRect; destination: CanvasImageRect } | null {
  let source: CanvasImageRect = { x: 0, y: 0, width: imageWidth, height: imageHeight }
  let destination: CanvasImageRect

  if (args.length === 2) {
    destination = { x: finite(args[0]!), y: finite(args[1]!), width: imageWidth, height: imageHeight }
  } else if (args.length === 4) {
    destination = normalizeImageRect(args[0]!, args[1]!, args[2]!, args[3]!)
  } else if (args.length === 8) {
    source = normalizeImageRect(args[0]!, args[1]!, args[2]!, args[3]!)
    destination = normalizeImageRect(args[4]!, args[5]!, args[6]!, args[7]!)
  } else {
    throw new TypeError("Canvas drawImage() expects 3, 5, or 9 arguments")
  }

  if (source.width === 0 || source.height === 0 || destination.width === 0 || destination.height === 0) {
    return null
  }

  const scaleX = destination.width / source.width
  const scaleY = destination.height / source.height
  const sourceRight = source.x + source.width
  const sourceBottom = source.y + source.height
  const clippedLeft = Math.max(0, source.x)
  const clippedTop = Math.max(0, source.y)
  const clippedRight = Math.min(imageWidth, sourceRight)
  const clippedBottom = Math.min(imageHeight, sourceBottom)
  if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) return null

  destination = {
    x: destination.x + (clippedLeft - source.x) * scaleX,
    y: destination.y + (clippedTop - source.y) * scaleY,
    width: (clippedRight - clippedLeft) * scaleX,
    height: (clippedBottom - clippedTop) * scaleY,
  }
  source = {
    x: clippedLeft,
    y: clippedTop,
    width: clippedRight - clippedLeft,
    height: clippedBottom - clippedTop,
  }

  return { source, destination }
}

function normalizeImageRect(x: number, y: number, width: number, height: number): CanvasImageRect {
  let left = finite(x)
  let top = finite(y)
  let normalizedWidth = finite(width)
  let normalizedHeight = finite(height)
  if (normalizedWidth < 0) {
    left += normalizedWidth
    normalizedWidth = -normalizedWidth
  }
  if (normalizedHeight < 0) {
    top += normalizedHeight
    normalizedHeight = -normalizedHeight
  }
  return { x: left, y: top, width: normalizedWidth, height: normalizedHeight }
}

function transformImageRect(rect: CanvasImageRect, matrix: CanvasMatrix): CanvasImageRect {
  const [a, b, c, d, e, f] = matrix
  const tolerance = Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) * 1e-9
  if (
    Math.abs(b) > tolerance ||
    Math.abs(c) > tolerance ||
    a <= Number.EPSILON ||
    d <= Number.EPSILON
  ) {
    throw new Error(
      "GPUix Canvas2D drawImage() currently requires translation plus positive axis-aligned scale",
    )
  }
  return {
    x: a * rect.x + e,
    y: d * rect.y + f,
    width: a * rect.width,
    height: d * rect.height,
  }
}

function withCanvasClip(command: CanvasDrawCommand, clip: CanvasClipRect | null): CanvasDrawCommand {
  if (clip) command.clip = { ...clip }
  return command
}

function rectangularClipFromPath(path: readonly CanvasPathSegment[]): CanvasClipRect | null {
  if (path.length !== 5 || path[4]?.op !== "closePath") return null

  const points: Array<readonly [number, number]> = []
  for (let index = 0; index < 4; index += 1) {
    const segment = path[index]
    if (!segment || (segment.op !== "moveTo" && segment.op !== "lineTo")) return null
    points.push([segment.x, segment.y])
  }

  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  const tolerance = Math.max(1, Math.abs(left), Math.abs(right), Math.abs(top), Math.abs(bottom)) * 1e-6
  const near = (a: number, b: number) => Math.abs(a - b) <= tolerance

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    if (!near(current[0], next[0]) && !near(current[1], next[1])) return null
  }

  const corners: Array<readonly [number, number]> = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ]
  if (!corners.every((corner) => points.some((point) => near(point[0], corner[0]) && near(point[1], corner[1])))) {
    return null
  }

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function intersectClipRects(current: CanvasClipRect | null, next: CanvasClipRect): CanvasClipRect {
  if (!current) return { ...next }
  const left = Math.max(current.x, next.x)
  const top = Math.max(current.y, next.y)
  const right = Math.min(current.x + current.width, next.x + next.width)
  const bottom = Math.min(current.y + current.height, next.y + next.height)
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
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
  radii: number | number[],
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
  radii: number | number[],
): [number, number, number, number] {
  const values = Array.isArray(radii) ? [...radii] : [radii]

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

function appendArcTo(
  path: CanvasPathSegment[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  matrix: CanvasMatrix,
): void {
  const r = finite(radius)
  if (r < 0) {
    throw new DOMException("The radius provided is negative.", "IndexSizeError")
  }

  const corner: readonly [number, number] = [finite(x1), finite(y1)]
  const next: readonly [number, number] = [finite(x2), finite(y2)]
  const currentCanvas = currentPathPoint(path)
  if (!currentCanvas) {
    const point = transformPoint(corner[0], corner[1], matrix)
    path.push({ op: "moveTo", x: point[0], y: point[1] })
    return
  }

  const inverse = invertMatrix(matrix)
  const current = transformPoint(currentCanvas[0], currentCanvas[1], inverse)
  const incomingX = current[0] - corner[0]
  const incomingY = current[1] - corner[1]
  const outgoingX = next[0] - corner[0]
  const outgoingY = next[1] - corner[1]
  const incomingLength = Math.hypot(incomingX, incomingY)
  const outgoingLength = Math.hypot(outgoingX, outgoingY)

  if (
    r === 0 ||
    incomingLength <= Number.EPSILON ||
    outgoingLength <= Number.EPSILON
  ) {
    appendLineTo(path, corner[0], corner[1], matrix)
    return
  }

  const incoming: readonly [number, number] = [
    incomingX / incomingLength,
    incomingY / incomingLength,
  ]
  const outgoing: readonly [number, number] = [
    outgoingX / outgoingLength,
    outgoingY / outgoingLength,
  ]
  const cross = incoming[0] * outgoing[1] - incoming[1] * outgoing[0]
  const dot = Math.max(-1, Math.min(1, incoming[0] * outgoing[0] + incoming[1] * outgoing[1]))

  if (Math.abs(cross) <= 1e-12 || Math.abs(1 - Math.abs(dot)) <= 1e-12) {
    appendLineTo(path, corner[0], corner[1], matrix)
    return
  }

  const angle = Math.acos(dot)
  const tangentDistance = r / Math.tan(angle / 2)
  if (!Number.isFinite(tangentDistance)) {
    appendLineTo(path, corner[0], corner[1], matrix)
    return
  }

  const tangent1: readonly [number, number] = [
    corner[0] + incoming[0] * tangentDistance,
    corner[1] + incoming[1] * tangentDistance,
  ]
  const tangent2: readonly [number, number] = [
    corner[0] + outgoing[0] * tangentDistance,
    corner[1] + outgoing[1] * tangentDistance,
  ]
  const turn = Math.sign(cross)
  const center: readonly [number, number] = [
    tangent1[0] + (-incoming[1]) * turn * r,
    tangent1[1] + incoming[0] * turn * r,
  ]
  const startAngle = Math.atan2(tangent1[1] - center[1], tangent1[0] - center[0])
  const endAngle = Math.atan2(tangent2[1] - center[1], tangent2[0] - center[0])

  appendArc(
    path,
    center[0],
    center[1],
    r,
    startAngle,
    endAngle,
    cross > 0,
    matrix,
  )
}

function appendLineTo(
  path: CanvasPathSegment[],
  x: number,
  y: number,
  matrix: CanvasMatrix,
): void {
  const point = transformPoint(x, y, matrix)
  path.push({ op: "lineTo", x: point[0], y: point[1] })
}

function currentPathPoint(path: readonly CanvasPathSegment[]): readonly [number, number] | null {
  let subpathStart: readonly [number, number] | null = null
  let current: readonly [number, number] | null = null
  for (const segment of path) {
    switch (segment.op) {
      case "moveTo":
        subpathStart = [segment.x, segment.y]
        current = subpathStart
        break
      case "lineTo":
      case "quadraticCurveTo":
      case "bezierCurveTo":
        current = [segment.x, segment.y]
        break
      case "closePath":
        current = subpathStart
        break
    }
  }
  return current
}

function invertMatrix(matrix: CanvasMatrix): CanvasMatrix {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c
  const tolerance = Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) * 1e-12
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= tolerance) {
    throw new TypeError("GPUix Canvas2D cannot apply arcTo() with a non-invertible transform")
  }
  const inverse = 1 / determinant
  return [
    d * inverse,
    -b * inverse,
    -c * inverse,
    a * inverse,
    (c * f - d * e) * inverse,
    (b * e - a * f) * inverse,
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
  if (
    !Number.isFinite(a) ||
    b === undefined || !Number.isFinite(b) ||
    c === undefined || !Number.isFinite(c) ||
    d === undefined || !Number.isFinite(d) ||
    e === undefined || !Number.isFinite(e) ||
    f === undefined || !Number.isFinite(f)
  ) {
    throw new TypeError("GPUix Canvas2D v3 supports only the six-number setTransform() overload")
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
    throw new TypeError(`GPUix Canvas2D v3 supports string ${property} values only`)
  }
  return serialized
}

function parseFont(value: string): ParsedFont {
  const match = value.trim().match(/^(?:(normal|bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/)
  if (!match) {
    throw new TypeError(`GPUix Canvas2D v3 cannot represent font ${JSON.stringify(value)}`)
  }
  const size = Number(match[2])
  const family = match[3]?.trim()
  if (!Number.isFinite(size) || size <= 0 || !family) {
    throw new TypeError(`GPUix Canvas2D v3 cannot represent font ${JSON.stringify(value)}`)
  }
  const token = match[1]
  const weight = token === "bold"
    ? 700
    : token && token !== "normal"
      ? Number(token)
      : undefined
  return weight === undefined ? { size, family } : { size, family, weight }
}
