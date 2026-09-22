import type { CanvasMatrix, CanvasPathSegment } from "./canvas.js"

export type CanvasPoint = readonly [number, number]

type RoundRectCorner = {
  x: number
  y: number
}

export function point2D(x: number, y: number): CanvasPoint {
  return [finite(x), finite(y)]
}

export function arcEndpoints(
  xValue: number,
  yValue: number,
  radiusValue: number,
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
): { start: CanvasPoint; end: CanvasPoint } | null {
  const x = finite(xValue)
  const y = finite(yValue)
  const radius = finite(radiusValue)
  if (radius < 0) {
    throw new DOMException("The radius provided is negative.", "IndexSizeError")
  }
  if (radius === 0) return null

  const angles = normalizeArcAngles(startAngle, endAngle, counterclockwise)
  if (!angles) return null
  return {
    start: point2D(
      x + Math.cos(angles.start) * radius,
      y + Math.sin(angles.start) * radius,
    ),
    end: point2D(
      x + Math.cos(angles.end) * radius,
      y + Math.sin(angles.end) * radius,
    ),
  }
}

export function roundedRectanglePath(
  inputX: number,
  inputY: number,
  inputWidth: number,
  inputHeight: number,
  radii: number | DOMPointInit | Iterable<number | DOMPointInit>,
  matrix: CanvasMatrix,
): { path: CanvasPathSegment[]; start: CanvasPoint } {
  let x = finite(inputX)
  let y = finite(inputY)
  let width = finite(inputWidth)
  let height = finite(inputHeight)
  let [topLeft, topRight, bottomRight, bottomLeft] = roundRectCorners(radii)

  if (width < 0) {
    x += width
    width = -width
    ;[topLeft, topRight, bottomRight, bottomLeft] = [
      topRight,
      topLeft,
      bottomLeft,
      bottomRight,
    ]
  }
  if (height < 0) {
    y += height
    height = -height
    ;[topLeft, topRight, bottomRight, bottomLeft] = [
      bottomLeft,
      bottomRight,
      topRight,
      topLeft,
    ]
  }

  const ratios = [
    radiusRatio(width, topLeft.x + topRight.x),
    radiusRatio(width, bottomLeft.x + bottomRight.x),
    radiusRatio(height, topLeft.y + bottomLeft.y),
    radiusRatio(height, topRight.y + bottomRight.y),
  ]
  const scale = Math.min(1, ...ratios)
  if (scale < 1) {
    for (const corner of [topLeft, topRight, bottomRight, bottomLeft]) {
      corner.x *= scale
      corner.y *= scale
    }
  }

  const kappa = 0.5522847498307936
  const start = point2D(x + topLeft.x, y)
  const path: CanvasPathSegment[] = []

  pushMove(path, start[0], start[1], matrix)
  pushLine(path, x + width - topRight.x, y, matrix)
  pushCubic(
    path,
    x + width - topRight.x + kappa * topRight.x,
    y,
    x + width,
    y + topRight.y - kappa * topRight.y,
    x + width,
    y + topRight.y,
    matrix,
  )
  pushLine(path, x + width, y + height - bottomRight.y, matrix)
  pushCubic(
    path,
    x + width,
    y + height - bottomRight.y + kappa * bottomRight.y,
    x + width - bottomRight.x + kappa * bottomRight.x,
    y + height,
    x + width - bottomRight.x,
    y + height,
    matrix,
  )
  pushLine(path, x + bottomLeft.x, y + height, matrix)
  pushCubic(
    path,
    x + bottomLeft.x - kappa * bottomLeft.x,
    y + height,
    x,
    y + height - bottomLeft.y + kappa * bottomLeft.y,
    x,
    y + height - bottomLeft.y,
    matrix,
  )
  pushLine(path, x, y + topLeft.y, matrix)
  pushCubic(
    path,
    x,
    y + topLeft.y - kappa * topLeft.y,
    x + topLeft.x - kappa * topLeft.x,
    y,
    start[0],
    start[1],
    matrix,
  )
  path.push({ op: "closePath" })

  return { path, start }
}

export function appendArcTo(
  path: CanvasPathSegment[],
  currentPoint: CanvasPoint | null,
  x1Value: number,
  y1Value: number,
  x2Value: number,
  y2Value: number,
  radiusValue: number,
  matrix: CanvasMatrix,
): {
  currentPoint: CanvasPoint
  subpathStart: CanvasPoint | null
} {
  const first = point2D(x1Value, y1Value)
  const second = point2D(x2Value, y2Value)
  const radius = finite(radiusValue)
  if (radius < 0) {
    throw new DOMException("The radius provided is negative.", "IndexSizeError")
  }

  if (currentPoint === null) {
    pushMove(path, first[0], first[1], matrix)
    return { currentPoint: first, subpathStart: first }
  }

  const toCurrent = point2D(
    currentPoint[0] - first[0],
    currentPoint[1] - first[1],
  )
  const toSecond = point2D(
    second[0] - first[0],
    second[1] - first[1],
  )
  const currentLength = Math.hypot(toCurrent[0], toCurrent[1])
  const secondLength = Math.hypot(toSecond[0], toSecond[1])
  const cross = toCurrent[0] * toSecond[1] - toCurrent[1] * toSecond[0]

  if (
    radius === 0
    || currentLength <= Number.EPSILON
    || secondLength <= Number.EPSILON
    || Math.abs(cross) <= Number.EPSILON * currentLength * secondLength
  ) {
    pushLine(path, first[0], first[1], matrix)
    return { currentPoint: first, subpathStart: null }
  }

  const unitCurrent = point2D(
    toCurrent[0] / currentLength,
    toCurrent[1] / currentLength,
  )
  const unitSecond = point2D(
    toSecond[0] / secondLength,
    toSecond[1] / secondLength,
  )
  const dot = Math.max(
    -1,
    Math.min(
      1,
      unitCurrent[0] * unitSecond[0] + unitCurrent[1] * unitSecond[1],
    ),
  )
  const angle = Math.acos(dot)
  const tangentDistance = radius / Math.tan(angle / 2)
  const bisector = point2D(
    unitCurrent[0] + unitSecond[0],
    unitCurrent[1] + unitSecond[1],
  )
  const bisectorLength = Math.hypot(bisector[0], bisector[1])

  if (!Number.isFinite(tangentDistance) || bisectorLength <= Number.EPSILON) {
    pushLine(path, first[0], first[1], matrix)
    return { currentPoint: first, subpathStart: null }
  }

  const tangentStart = point2D(
    first[0] + unitCurrent[0] * tangentDistance,
    first[1] + unitCurrent[1] * tangentDistance,
  )
  const tangentEnd = point2D(
    first[0] + unitSecond[0] * tangentDistance,
    first[1] + unitSecond[1] * tangentDistance,
  )
  const centerDistance = radius / Math.sin(angle / 2)
  const center = point2D(
    first[0] + (bisector[0] / bisectorLength) * centerDistance,
    first[1] + (bisector[1] / bisectorLength) * centerDistance,
  )

  appendArcSegments(
    path,
    center[0],
    center[1],
    radius,
    Math.atan2(tangentStart[1] - center[1], tangentStart[0] - center[0]),
    Math.atan2(tangentEnd[1] - center[1], tangentEnd[0] - center[0]),
    cross > 0,
    matrix,
  )

  return { currentPoint: tangentEnd, subpathStart: null }
}

function appendArcSegments(
  path: CanvasPathSegment[],
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
  matrix: CanvasMatrix,
): void {
  const angles = normalizeArcAngles(startAngle, endAngle, counterclockwise)
  if (!angles) return

  const sweep = angles.end - angles.start
  const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)))
  const step = sweep / segments
  pushLine(
    path,
    x + Math.cos(angles.start) * radius,
    y + Math.sin(angles.start) * radius,
    matrix,
  )

  for (let index = 0; index < segments; index += 1) {
    const a0 = angles.start + step * index
    const a1 = a0 + step
    const k = (4 / 3) * Math.tan((a1 - a0) / 4)
    pushCubic(
      path,
      x + radius * (Math.cos(a0) - k * Math.sin(a0)),
      y + radius * (Math.sin(a0) + k * Math.cos(a0)),
      x + radius * (Math.cos(a1) + k * Math.sin(a1)),
      y + radius * (Math.sin(a1) - k * Math.cos(a1)),
      x + radius * Math.cos(a1),
      y + radius * Math.sin(a1),
      matrix,
    )
  }
}

function normalizeArcAngles(
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
): { start: number; end: number } | null {
  const start = finite(startAngle)
  let end = finite(endAngle)
  const full = Math.PI * 2
  if (!counterclockwise) {
    while (end < start) end += full
    end = Math.min(end, start + full)
  } else {
    while (end > start) end -= full
    end = Math.max(end, start - full)
  }
  if (Math.abs(end - start) < Number.EPSILON) return null
  return { start, end }
}

function roundRectCorners(
  radii: number | DOMPointInit | Iterable<number | DOMPointInit>,
): [RoundRectCorner, RoundRectCorner, RoundRectCorner, RoundRectCorner] {
  let values: (number | DOMPointInit)[]
  if (typeof radii === "number") {
    values = [radii]
  } else if (
    typeof radii === "object"
    && radii !== null
    && Symbol.iterator in radii
  ) {
    values = Array.from(radii)
  } else {
    values = [radii]
  }

  if (values.length < 1 || values.length > 4) {
    throw new RangeError("RoundRect radii must contain between one and four values")
  }

  const corners = values.map(roundRectCorner)
  const first = corners[0]!
  const second = corners[1] ?? first
  const third = corners[2] ?? first
  const fourth = corners[3] ?? second

  if (corners.length === 1) return [first, first, first, first]
  if (corners.length === 2) return [first, second, first, second]
  if (corners.length === 3) return [first, second, third, second]
  return [first, second, third, fourth]
}

function roundRectCorner(value: number | DOMPointInit): RoundRectCorner {
  const x = typeof value === "number" ? finite(value) : finite(value.x ?? 0)
  const y = typeof value === "number" ? x : finite(value.y ?? 0)
  if (x < 0 || y < 0) {
    throw new RangeError("RoundRect radius must be non-negative")
  }
  return { x, y }
}

function radiusRatio(side: number, radiusSum: number): number {
  return radiusSum > 0 ? side / radiusSum : 1
}

function pushMove(
  path: CanvasPathSegment[],
  x: number,
  y: number,
  matrix: CanvasMatrix,
): void {
  const point = transformPoint(x, y, matrix)
  path.push({ op: "moveTo", x: point[0], y: point[1] })
}

function pushLine(
  path: CanvasPathSegment[],
  x: number,
  y: number,
  matrix: CanvasMatrix,
): void {
  const point = transformPoint(x, y, matrix)
  path.push({ op: "lineTo", x: point[0], y: point[1] })
}

function pushCubic(
  path: CanvasPathSegment[],
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  x: number,
  y: number,
  matrix: CanvasMatrix,
): void {
  const control1 = transformPoint(cp1x, cp1y, matrix)
  const control2 = transformPoint(cp2x, cp2y, matrix)
  const point = transformPoint(x, y, matrix)
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

function transformPoint(
  x: number,
  y: number,
  matrix: CanvasMatrix,
): CanvasPoint {
  const [a, b, c, d, e, f] = matrix
  return [a * finite(x) + c * finite(y) + e, b * finite(x) + d * finite(y) + f]
}

function finite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError("Canvas coordinate must be a finite number")
  }
  return value
}
