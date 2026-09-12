import * as base from "./gpuix-solid-canvas"

type HostNode = ReturnType<typeof base.createElement>
type HostElement = Extract<HostNode, { kind: "element" }>
type CanvasHost = HostElement & { width?: number; height?: number }
type CanvasPoint = readonly [number, number]
type CanvasMatrix = readonly [number, number, number, number, number, number]
type CanvasSize = { width: number; height: number }
type CanvasTextAlignValue = CanvasRenderingContext2D["textAlign"]
type CanvasTextBaselineValue = CanvasRenderingContext2D["textBaseline"]
type CanvasPaint = CanvasRenderingContext2D["fillStyle"]

type CanvasPath =
  | { kind: "polyline"; points: CanvasPoint[] }
  | { kind: "circle"; x: number; y: number; radius: number; transform: CanvasMatrix }

type ParsedCanvasFont = {
  size: number
  family: string
  weight?: number
}

type CanvasCommand =
  | { kind: "fill-polygon"; points: readonly CanvasPoint[]; color: string }
  | { kind: "stroke-polyline"; points: readonly CanvasPoint[]; color: string; width: number }
  | { kind: "fill-circle"; x: number; y: number; radius: number; transform: CanvasMatrix; color: string }
  | { kind: "stroke-circle"; x: number; y: number; radius: number; transform: CanvasMatrix; color: string; width: number }
  | {
      kind: "text"
      x: number
      y: number
      value: string
      color: string
      font: ParsedCanvasFont
      align: CanvasTextAlignValue
      baseline: CanvasTextBaselineValue
    }

type CanvasDrawing = {
  context: CanvasRenderingContext2D
  toSvg(): string
}

type RuntimeState = {
  drawing: CanvasDrawing
  surface?: HostElement
  lastSource?: string
  queued: boolean
}

const runtimeStates = new WeakMap<CanvasHost, RuntimeState>()

export function installLayeredCanvas2D(node: CanvasHost): void {
  Object.defineProperty(node, "getContext", {
    configurable: true,
    value(contextId: string): CanvasRenderingContext2D | null {
      if (contextId !== "2d") return null
      let state = runtimeStates.get(node)
      if (!state) {
        let nextState: RuntimeState | undefined
        const drawing = createCanvasDrawing(
          () => canvasBackingSize(node),
          () => {
            if (nextState) scheduleRender(node, nextState)
          },
        )
        nextState = { drawing, queued: false }
        state = nextState
        runtimeStates.set(node, state)
        scheduleRender(node, state)
      }
      return state.drawing.context
    },
  })
}

function scheduleRender(node: CanvasHost, state: RuntimeState): void {
  if (state.queued) return
  state.queued = true
  queueMicrotask(() => {
    state.queued = false
    if (!node.nativeAlive || !node.root) return

    const source = state.drawing.toSvg()
    if (source === state.lastSource) return

    let surface = state.surface
    if (!surface) {
      const created = base.createElement("img")
      if (created.kind !== "element") throw new Error("Canvas2D bridge expected an image host element")
      surface = created
      state.surface = surface
      base.setProp(surface, "testId", "gpuix-canvas-2d-surface")
      base.setProp(surface, "style", {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: "none",
        flexShrink: 0,
      })
      base.setProp(surface, "objectFit", "fill")
      base.insertNode(node, surface)
    }

    // GPUIX keeps image element state across paints, which is substantially
    // cheaper to scroll than rebuilding a retained raw-SVG element. Its data
    // URL decoder accepts the serialized SVG bytes directly, so one mutation
    // is enough; MutationDriver batches the frame with surrounding updates.
    base.setProp(surface, "src", `data:image/svg+xml,${source}`)
    state.lastSource = source
  })
}

function createCanvasDrawing(getSize: () => CanvasSize, onChange: () => void): CanvasDrawing {
  let commands: CanvasCommand[] = []
  let path: CanvasPath | undefined
  let transform: CanvasMatrix = [1, 0, 0, 1, 0, 0]
  let fillStyle = "#000000"
  let strokeStyle = "#000000"
  let lineWidth = 1
  let imageSmoothingEnabled = true
  let font = "10px sans-serif"
  let textAlign: CanvasTextAlignValue = "start"
  let textBaseline: CanvasTextBaselineValue = "alphabetic"

  // SAFETY: this intentionally partial object is only exposed as the narrow
  // Canvas2D surface exercised by the pinned DAW source; unsupported methods
  // remain absent and supported operations validate/fail closed below.
  const context = {
    get fillStyle() { return fillStyle },
    set fillStyle(value: CanvasPaint) { fillStyle = parseStringPaint(value, "fillStyle") },
    get strokeStyle() { return strokeStyle },
    set strokeStyle(value: CanvasPaint) { strokeStyle = parseStringPaint(value, "strokeStyle") },
    get lineWidth() { return lineWidth },
    set lineWidth(value: number) { lineWidth = Number.isFinite(value) && value > 0 ? value : 1 },
    get imageSmoothingEnabled() { return imageSmoothingEnabled },
    set imageSmoothingEnabled(value: boolean) { imageSmoothingEnabled = Boolean(value) },
    get font() { return font },
    set font(value: string) {
      parseCanvasFont(value)
      font = value
    },
    get textAlign() { return textAlign },
    set textAlign(value: CanvasTextAlignValue) { textAlign = value },
    get textBaseline() { return textBaseline },
    set textBaseline(value: CanvasTextBaselineValue) { textBaseline = value },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
      transform = [a, b, c, d, e, f]
    },
    clearRect(x: number, y: number, width: number, height: number) {
      const points = rectanglePoints(x, y, width, height, transform)
      if (!coversSurface(points, getSize())) {
        throw new Error("Canvas2D SVG bridge currently supports only full-surface clearRect()")
      }
      commands = []
      path = undefined
      onChange()
    },
    fillRect(x: number, y: number, width: number, height: number) {
      const points = rectanglePoints(x, y, width, height, transform)
      // Canvas is immediate-mode: an opaque full-surface fill completely hides
      // every earlier command. The EQ repaints this way instead of clearRect().
      // Treat that fill as an occlusion boundary so retained SVG commands cannot
      // grow without bound during a long interaction.
      if (isIdentityTransform(transform) && isOpaquePaint(fillStyle) && coversSurface(points, getSize())) {
        commands = []
        path = undefined
      }
      commands.push({
        kind: "fill-polygon",
        points,
        color: fillStyle,
      })
      onChange()
    },
    beginPath() { path = undefined },
    moveTo(x: number, y: number) {
      path = { kind: "polyline", points: [transformPoint(x, y, transform)] }
    },
    lineTo(x: number, y: number) {
      const point = transformPoint(x, y, transform)
      if (!path) {
        path = { kind: "polyline", points: [point] }
        return
      }
      if (path.kind !== "polyline") {
        throw new Error("Canvas2D SVG bridge does not mix line segments with an arc in one path")
      }
      path.points.push(point)
    },
    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      _counterclockwise?: boolean,
    ) {
      if (!Number.isFinite(radius) || radius < 0) {
        throw new Error("Canvas2D SVG bridge requires a finite non-negative arc radius")
      }
      if (!isFullCircleArc(startAngle, endAngle)) {
        throw new Error("Canvas2D SVG bridge currently supports only full-circle arc() paths")
      }
      path = { kind: "circle", x, y, radius, transform: cloneMatrix(transform) }
    },
    fill() {
      if (!path) return
      if (path.kind === "circle") {
        commands.push({ ...path, kind: "fill-circle", color: fillStyle })
      } else if (path.points.length >= 3) {
        commands.push({ kind: "fill-polygon", points: [...path.points], color: fillStyle })
      }
      onChange()
    },
    stroke() {
      if (!path) return
      if (path.kind === "circle") {
        commands.push({ ...path, kind: "stroke-circle", color: strokeStyle, width: lineWidth })
      } else if (path.points.length >= 2) {
        commands.push({
          kind: "stroke-polyline",
          points: [...path.points],
          color: strokeStyle,
          width: transformedLineWidth(lineWidth, transform),
        })
      } else {
        return
      }
      onChange()
    },
    fillText(value: string, x: number, y: number, maxWidth?: number) {
      if (maxWidth !== undefined) throw new Error("Canvas2D SVG bridge does not support fillText() maxWidth")
      if (!isIdentityTransform(transform)) {
        throw new Error("Canvas2D SVG bridge supports fillText() only with the identity transform")
      }
      const [tx, ty] = transformPoint(x, y, transform)
      commands.push({
        kind: "text",
        x: tx,
        y: ty,
        value: String(value),
        color: fillStyle,
        font: parseCanvasFont(font),
        align: textAlign,
        baseline: textBaseline,
      })
      onChange()
    },
  } as CanvasRenderingContext2D

  return {
    context,
    toSvg() {
      return svgForCommands(commands, getSize())
    },
  }
}

function canvasBackingSize(node: CanvasHost): CanvasSize {
  const width = finitePositive(Number(node.width))
  const height = finitePositive(Number(node.height))
  if (width !== undefined && height !== undefined) return { width, height }

  const bounds = node.getBoundingClientRect()
  return normalizedSize({
    width: width ?? bounds.width,
    height: height ?? bounds.height,
  })
}

function svgForCommands(commands: readonly CanvasCommand[], size: CanvasSize): string {
  const normalized = normalizedSize(size)
  const body = serializeCommands(commands)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(normalized.width)} ${formatNumber(normalized.height)}" preserveAspectRatio="none">${body}</svg>`
}

function serializeCommands(commands: readonly CanvasCommand[]): string {
  let output = ""
  let index = 0

  while (index < commands.length) {
    const command = commands[index]
    if (command.kind === "fill-polygon") {
      const run: Array<Extract<CanvasCommand, { kind: "fill-polygon" }>> = [command]
      index += 1
      while (index < commands.length) {
        const next = commands[index]
        if (next.kind !== "fill-polygon" || next.color !== command.color) break
        run.push(next)
        index += 1
      }
      output += serializeFillPolygonRun(run)
      continue
    }

    if (command.kind === "stroke-polyline") {
      const run: Array<Extract<CanvasCommand, { kind: "stroke-polyline" }>> = [command]
      index += 1
      while (index < commands.length) {
        const next = commands[index]
        if (next.kind !== "stroke-polyline" || next.color !== command.color || next.width !== command.width) break
        run.push(next)
        index += 1
      }
      output += serializeStrokePolylineRun(run)
      continue
    }

    output += serializeCommand(command)
    index += 1
  }

  return output
}

function serializeFillPolygonRun(
  commands: readonly Extract<CanvasCommand, { kind: "fill-polygon" }>[],
): string {
  const paths = commands.map((command) => closedPath(command.points)).join("")
  return `<path d="${paths}" fill="${escapeXmlAttribute(commands[0].color)}"/>`
}

function serializeStrokePolylineRun(
  commands: readonly Extract<CanvasCommand, { kind: "stroke-polyline" }>[],
): string {
  const paths = commands.map((command) => openPath(command.points)).join("")
  const first = commands[0]
  return `<path d="${paths}" fill="none" stroke="${escapeXmlAttribute(first.color)}" stroke-width="${formatNumber(first.width)}"/>`
}

function openPath(points: readonly CanvasPoint[]): string {
  if (points.length === 0) return ""
  const [first, ...rest] = points
  return `M${formatNumber(first[0])} ${formatNumber(first[1])}${rest.map(([x, y]) => `L${formatNumber(x)} ${formatNumber(y)}`).join("")}`
}

function closedPath(points: readonly CanvasPoint[]): string {
  return `${openPath(points)}Z`
}

function serializeCommand(command: Exclude<CanvasCommand, { kind: "fill-polygon" } | { kind: "stroke-polyline" }>): string {
  if (command.kind === "fill-circle" || command.kind === "stroke-circle") {
    const transformAttribute = isIdentityTransform(command.transform)
      ? ""
      : ` transform="matrix(${command.transform.map(formatNumber).join(" ")})"`
    if (command.kind === "fill-circle") {
      return `<circle cx="${formatNumber(command.x)}" cy="${formatNumber(command.y)}" r="${formatNumber(command.radius)}"${transformAttribute} fill="${escapeXmlAttribute(command.color)}"/>`
    }
    return `<circle cx="${formatNumber(command.x)}" cy="${formatNumber(command.y)}" r="${formatNumber(command.radius)}"${transformAttribute} fill="none" stroke="${escapeXmlAttribute(command.color)}" stroke-width="${formatNumber(command.width)}"/>`
  }

  const baseline = svgDominantBaseline(command.baseline)
  const baselineAttribute = baseline ? ` dominant-baseline="${baseline}"` : ""
  const weightAttribute = command.font.weight ? ` font-weight="${command.font.weight}"` : ""
  return `<text x="${formatNumber(command.x)}" y="${formatNumber(command.y)}" fill="${escapeXmlAttribute(command.color)}" font-size="${formatNumber(command.font.size)}" font-family="${escapeXmlAttribute(command.font.family)}"${weightAttribute} text-anchor="${svgTextAnchor(command.align)}"${baselineAttribute}>${escapeXmlText(command.value)}</text>`
}

function finitePositive(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function normalizedSize(size: CanvasSize): CanvasSize {
  return {
    width: finitePositive(size.width) ?? 1,
    height: finitePositive(size.height) ?? 1,
  }
}

function transformPoint(x: number, y: number, matrix: CanvasMatrix): CanvasPoint {
  const [a, b, c, d, e, f] = matrix
  return [a * x + c * y + e, b * x + d * y + f]
}

function cloneMatrix(matrix: CanvasMatrix): CanvasMatrix {
  return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
}

function rectanglePoints(x: number, y: number, width: number, height: number, matrix: CanvasMatrix): readonly CanvasPoint[] {
  return [
    transformPoint(x, y, matrix),
    transformPoint(x + width, y, matrix),
    transformPoint(x + width, y + height, matrix),
    transformPoint(x, y + height, matrix),
  ]
}

function coversSurface(points: readonly CanvasPoint[], size: CanvasSize): boolean {
  const normalized = normalizedSize(size)
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const epsilon = 0.01
  return Math.min(...xs) <= epsilon &&
    Math.min(...ys) <= epsilon &&
    Math.max(...xs) >= normalized.width - epsilon &&
    Math.max(...ys) >= normalized.height - epsilon
}

function transformedLineWidth(width: number, matrix: CanvasMatrix): number {
  const [a, b, c, d] = matrix
  return width * Math.max(0.0001, (Math.hypot(a, b) + Math.hypot(c, d)) / 2)
}

function isIdentityTransform(matrix: CanvasMatrix): boolean {
  return matrix[0] === 1 && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === 1 && matrix[4] === 0 && matrix[5] === 0
}

function isFullCircleArc(startAngle: number, endAngle: number): boolean {
  return Number.isFinite(startAngle) && Number.isFinite(endAngle) && Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.000001
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

  const legacyRgba = paint.match(/^rgba\([^)]*,\s*([0-9.]+)\s*\)$/)
  if (legacyRgba) return Number(legacyRgba[1]) >= 1

  const slashAlpha = paint.match(/\/\s*([0-9.]+)(%)?\s*\)$/)
  if (slashAlpha) {
    const alpha = Number(slashAlpha[1])
    return slashAlpha[2] ? alpha >= 100 : alpha >= 1
  }

  return /^(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(/.test(paint)
}

function parseStringPaint(paint: CanvasPaint, property: string): string {
  const serialized = String(paint)
  if (paint !== serialized) throw new Error(`Canvas2D SVG bridge currently supports string ${property} values only`)
  return serialized
}

function parseCanvasFont(value: string): ParsedCanvasFont {
  const match = value.trim().match(/^(?:(normal|bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/)
  if (!match) throw new Error(`Canvas2D SVG bridge cannot represent Canvas font ${JSON.stringify(value)}`)
  const size = Number(match[2])
  const family = match[3]?.trim()
  if (!Number.isFinite(size) || size <= 0 || !family) {
    throw new Error(`Canvas2D SVG bridge cannot represent Canvas font ${JSON.stringify(value)}`)
  }
  const weightToken = match[1]
  const weight = weightToken === "bold"
    ? 700
    : weightToken && weightToken !== "normal"
      ? Number(weightToken)
      : undefined
  return { size, family, weight }
}

function svgTextAnchor(value: CanvasTextAlignValue): "start" | "middle" | "end" {
  switch (value) {
    case "center": return "middle"
    case "right":
    case "end": return "end"
    case "left":
    case "start": return "start"
  }
}

function svgDominantBaseline(value: CanvasTextBaselineValue): string | undefined {
  switch (value) {
    case "alphabetic": return undefined
    case "middle": return "middle"
    case "top": return "text-before-edge"
    case "bottom": return "text-after-edge"
    case "hanging": return "hanging"
    case "ideographic": return "ideographic"
  }
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

function escapeXmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}
