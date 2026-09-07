import {
  createElement as createNativeElement,
  getNativeStyleColorMode,
  insertNode as insertNativeNode,
  setProp as setNativeProp,
} from "@jhomra21/gpuix-solid1"

export * from "@jhomra21/gpuix-solid1"

type CanvasPoint = readonly [number, number]
type CanvasMatrix = readonly [number, number, number, number, number, number]
type CanvasSize = { width: number; height: number }
type CanvasPaint = CanvasRenderingContext2D["fillStyle"]
type CanvasTextAlignValue = CanvasRenderingContext2D["textAlign"]
type CanvasTextBaselineValue = CanvasRenderingContext2D["textBaseline"]
type NativeHostNode = ReturnType<typeof createNativeElement>
type NativeHostElement = Extract<NativeHostNode, { kind: "element" }>
type CanvasHostNode = NativeHostElement & {
  width?: number
  height?: number
}

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

type CanvasSurface = {
  context: CanvasRenderingContext2D
  toSvg(): string
}

type RuntimeCanvasState = {
  surface: NativeHostElement
  drawing: CanvasSurface
  queued: boolean
}

type CssVariableValue = string | number | undefined
type CssVariableSourceStyle = NativeHostElement["style"] & {
  [property: `--${string}`]: CssVariableValue
}

type HardSplitColors = {
  from: string
  to: string
}

export type CssVariableHardSplitCompat = {
  property: `--${string}`
  light: HardSplitColors
  dark: HardSplitColors
}

export type CssVariableIntervalOverlayCompat = {
  startProperty: `--${string}`
  endProperty: `--${string}`
  height: number
  light: string
  dark: string
}

type ResolvedHardSplit = {
  property: `--${string}`
  position: number
  colors: HardSplitColors
}

type ResolvedIntervalOverlay = {
  key: string
  start: number
  end: number
  height: number
  color: string
}

type ResolvedCssVariableStyle<T> = {
  style: T
  hardSplit?: ResolvedHardSplit
  intervalOverlays: ResolvedIntervalOverlay[]
}

type HardSplitSurfaceState = {
  property: `--${string}`
  surface: NativeHostElement
}

type IntervalOverlaySurfaceState = {
  container: NativeHostElement
  spacer: NativeHostElement
  surface: NativeHostElement
}

const runtimeCanvases = new WeakMap<CanvasHostNode, RuntimeCanvasState>()
const cssVariableHardSplits = new Map<`--${string}`, CssVariableHardSplitCompat>()
const cssVariableIntervalOverlays = new Map<string, CssVariableIntervalOverlayCompat>()
const hardSplitSurfaces = new WeakMap<NativeHostElement, HardSplitSurfaceState>()
const intervalOverlaySurfaces = new WeakMap<NativeHostElement, Map<string, IntervalOverlaySurfaceState>>()

function requireHostElement(node: NativeHostNode, tagName: string): NativeHostElement {
  if (node.kind !== "element") {
    throw new Error(`GPUIX Solid compatibility expected <${tagName}> to create a host element`)
  }
  return node
}

export function registerCssVariableHardSplit(config: CssVariableHardSplitCompat): void {
  cssVariableHardSplits.set(config.property, config)
}

export function registerCssVariableIntervalOverlay(config: CssVariableIntervalOverlayCompat): void {
  const key = `${config.startProperty}:${config.endProperty}`
  cssVariableIntervalOverlays.set(key, config)
}

export function createElement(tagName: string): NativeHostNode {
  const node = createNativeElement(tagName)
  if (tagName === "canvas") installCanvas2D(requireHostElement(node, tagName))
  return node
}

export function setProp<T>(
  node: NativeHostNode,
  name: string,
  value: T,
  previous?: T,
): void {
  if (name !== "style") {
    setNativeProp(node, name, value, previous)
    return
  }

  const next = resolveRegisteredCssVariablePaints(value)
  const previousStyle = previous === undefined
    ? undefined
    : resolveRegisteredCssVariablePaints(previous).style
  if (node.kind === "element") {
    syncHardSplitSurface(node, next.hardSplit)
    syncIntervalOverlaySurfaces(node, next.intervalOverlays)
  }
  setNativeProp(node, name, next.style, previousStyle)
}

export function insertNode(
  parent: Parameters<typeof insertNativeNode>[0],
  node: Parameters<typeof insertNativeNode>[1],
  anchor?: Parameters<typeof insertNativeNode>[2],
): void {
  insertNativeNode(parent, node, anchor)
}

function resolveRegisteredCssVariablePaints<T>(value: T): ResolvedCssVariableStyle<T> {
  if (!isStyleObject(value)) return { style: value, intervalOverlays: [] }

  // SAFETY: this compatibility boundary receives Solid's JSX style object before
  // the native normalizer. The copied source uses scalar CSS custom properties,
  // while all ordinary native StyleDesc fields keep their existing typed values.
  const sourceStyle = value as T & CssVariableSourceStyle
  let hardSplit: ResolvedHardSplit | undefined
  for (const [property, config] of cssVariableHardSplits) {
    const position = cssUnitInterval(sourceStyle[property])
    if (position === undefined) continue
    if (hardSplit) {
      throw new Error("GPUIX CSS hard-split compatibility supports one active split per host element")
    }
    hardSplit = {
      property,
      position,
      colors: getNativeStyleColorMode() === "dark" ? config.dark : config.light,
    }
  }

  const intervalOverlays: ResolvedIntervalOverlay[] = []
  for (const [key, config] of cssVariableIntervalOverlays) {
    const start = cssUnitInterval(sourceStyle[config.startProperty])
    const end = cssUnitInterval(sourceStyle[config.endProperty])
    if (start === undefined || end === undefined || end <= start) continue
    intervalOverlays.push({
      key,
      start,
      end,
      height: config.height,
      color: getNativeStyleColorMode() === "dark" ? config.dark : config.light,
    })
  }

  if (!hardSplit && intervalOverlays.length === 0) {
    return { style: value, intervalOverlays }
  }

  const nativeStyle = {
    ...sourceStyle,
    position: sourceStyle.position ?? "relative",
    overflow: sourceStyle.overflow ?? "hidden",
  }
  if (hardSplit) {
    nativeStyle.backgroundColor = hardSplit.colors.to
    delete nativeStyle.background
    delete nativeStyle[hardSplit.property]
  }
  for (const config of cssVariableIntervalOverlays.values()) {
    delete nativeStyle[config.startProperty]
    delete nativeStyle[config.endProperty]
  }
  return { style: nativeStyle, hardSplit, intervalOverlays }
}

function syncHardSplitSurface(node: NativeHostElement, hardSplit: ResolvedHardSplit | undefined): void {
  const existing = hardSplitSurfaces.get(node)
  if (!hardSplit) {
    if (existing) setNativeProp(existing.surface, "style", { display: "none", pointerEvents: "none" })
    return
  }

  let state = existing
  if (!state || state.property !== hardSplit.property) {
    if (state) setNativeProp(state.surface, "style", { display: "none", pointerEvents: "none" })
    const surface = requireHostElement(createNativeElement("div"), "div")
    setNativeProp(surface, "testId", "gpuix-css-hard-split-fill")
    state = { property: hardSplit.property, surface }
    hardSplitSurfaces.set(node, state)
    insertNativeNode(node, surface)
  }

  setNativeProp(state.surface, "style", {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: `${hardSplit.position * 100}%`,
    backgroundColor: hardSplit.colors.from,
    pointerEvents: "none",
    flexShrink: 0,
  })
}

function syncIntervalOverlaySurfaces(
  node: NativeHostElement,
  overlays: readonly ResolvedIntervalOverlay[],
): void {
  let states = intervalOverlaySurfaces.get(node)
  if (!states) {
    states = new Map()
    intervalOverlaySurfaces.set(node, states)
  }
  const active = new Set<string>()

  for (const overlay of overlays) {
    active.add(overlay.key)
    let state = states.get(overlay.key)
    if (!state) {
      const container = requireHostElement(createNativeElement("div"), "div")
      const spacer = requireHostElement(createNativeElement("div"), "div")
      const surface = requireHostElement(createNativeElement("div"), "div")
      setNativeProp(surface, "testId", "gpuix-css-interval-overlay")
      insertNativeNode(container, spacer)
      insertNativeNode(container, surface)
      state = { container, spacer, surface }
      states.set(overlay.key, state)
      insertNativeNode(node, container)
    }

    setNativeProp(state.container, "style", {
      display: "flex",
      flexDirection: "row",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: overlay.height,
      pointerEvents: "none",
    })
    setNativeProp(state.spacer, "style", {
      width: `${overlay.start * 100}%`,
      height: overlay.height,
      pointerEvents: "none",
      flexShrink: 0,
    })
    setNativeProp(state.surface, "style", {
      width: `${(overlay.end - overlay.start) * 100}%`,
      height: overlay.height,
      backgroundColor: overlay.color,
      pointerEvents: "none",
      flexShrink: 0,
    })
  }

  for (const [key, state] of states) {
    if (!active.has(key)) {
      setNativeProp(state.container, "style", { display: "none", pointerEvents: "none" })
    }
  }
}

function isStyleObject<T>(value: T): value is T & object {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function cssUnitInterval(value: CssVariableValue): number | undefined {
  if (value === undefined) return undefined
  const text = String(value).trim()
  const percentage = text.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))%$/)
  const parsed = percentage ? Number(percentage[1]) / 100 : Number(text)
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(0, Math.min(1, parsed))
}

function installCanvas2D(node: CanvasHostNode): void {
  Object.defineProperty(node, "getContext", {
    configurable: true,
    value(contextId: string): CanvasRenderingContext2D | null {
      if (contextId !== "2d") return null
      let state = runtimeCanvases.get(node)
      if (!state) {
        const surface = requireHostElement(createNativeElement("svg"), "svg")
        setNativeProp(surface, "testId", "gpuix-canvas-2d-surface")
        let nextState: RuntimeCanvasState | undefined
        const drawing = createCanvasSurface(
          () => canvasBackingSize(node),
          () => {
            if (nextState) scheduleCanvasRender(node, nextState)
          },
        )
        nextState = { surface, drawing, queued: false }
        state = nextState
        runtimeCanvases.set(node, state)
        insertNativeNode(node, surface)
        scheduleCanvasRender(node, state)
      }
      return state.drawing.context
    },
  })
}

function scheduleCanvasRender(node: CanvasHostNode, state: RuntimeCanvasState): void {
  if (state.queued) return
  state.queued = true
  queueMicrotask(() => {
    state.queued = false
    if (!node.nativeAlive || !node.root || !state.surface.nativeAlive) return
    const bounds = node.getBoundingClientRect()
    setNativeProp(state.surface, "style", {
      position: "absolute",
      top: 0,
      left: 0,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
      pointerEvents: "none",
      flexShrink: 0,
    })
    const source = state.drawing.toSvg()
    setNativeProp(state.surface, "source", source)
    setNativeProp(state.surface, "src", `data:image/svg+xml,${encodeURIComponent(source)}`)
    node.root.driver.flush()
  })
}

function createCanvasSurface(getSize: () => CanvasSize, onChange: () => void): CanvasSurface {
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

  // SAFETY: this compatibility context intentionally implements only the
  // Canvas2D operations exercised by the pinned DAW source. Unsupported APIs
  // stay absent or fail closed rather than being silently approximated.
  const context = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: CanvasPaint) {
      fillStyle = parseCanvasStringPaint(value, "fillStyle")
    },
    get strokeStyle() {
      return strokeStyle
    },
    set strokeStyle(value: CanvasPaint) {
      strokeStyle = parseCanvasStringPaint(value, "strokeStyle")
    },
    get lineWidth() {
      return lineWidth
    },
    set lineWidth(value: number) {
      lineWidth = Number.isFinite(value) && value > 0 ? value : 1
    },
    get imageSmoothingEnabled() {
      return imageSmoothingEnabled
    },
    set imageSmoothingEnabled(value: boolean) {
      imageSmoothingEnabled = Boolean(value)
    },
    get font() {
      return font
    },
    set font(value: string) {
      parseCanvasFont(value)
      font = value
    },
    get textAlign() {
      return textAlign
    },
    set textAlign(value: CanvasTextAlignValue) {
      textAlign = value
    },
    get textBaseline() {
      return textBaseline
    },
    set textBaseline(value: CanvasTextBaselineValue) {
      textBaseline = value
    },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
      transform = [a, b, c, d, e, f]
    },
    clearRect(x: number, y: number, width: number, height: number) {
      const points = rectanglePoints(x, y, width, height, transform)
      if (!coversSurface(points, getSize())) {
        throw new Error("GPUIX Canvas2D compatibility currently supports only full-surface clearRect()")
      }
      commands = []
      path = undefined
      onChange()
    },
    fillRect(x: number, y: number, width: number, height: number) {
      commands.push({
        kind: "fill-polygon",
        points: rectanglePoints(x, y, width, height, transform),
        color: fillStyle,
      })
      onChange()
    },
    beginPath() {
      path = undefined
    },
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
        throw new Error("GPUIX Canvas2D compatibility does not mix line segments with an arc in one path")
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
        throw new Error("GPUIX Canvas2D compatibility requires a finite non-negative arc radius")
      }
      if (!isFullCircleArc(startAngle, endAngle)) {
        throw new Error("GPUIX Canvas2D compatibility currently supports only full-circle arc() paths")
      }
      path = { kind: "circle", x, y, radius, transform: cloneCanvasMatrix(transform) }
    },
    fill() {
      if (!path) return
      if (path.kind === "circle") {
        commands.push({ kind: "fill-circle", ...path, color: fillStyle })
      } else if (path.points.length >= 3) {
        commands.push({ kind: "fill-polygon", points: [...path.points], color: fillStyle })
      }
      onChange()
    },
    stroke() {
      if (!path) return
      if (path.kind === "circle") {
        commands.push({
          kind: "stroke-circle",
          ...path,
          color: strokeStyle,
          width: lineWidth,
        })
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
      if (maxWidth !== undefined) {
        throw new Error("GPUIX Canvas2D compatibility does not support fillText() maxWidth")
      }
      if (!isIdentityTransform(transform)) {
        throw new Error("GPUIX Canvas2D compatibility currently supports fillText() only with the identity transform")
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
      const size = normalizedSize(getSize())
      const body = commands.map(serializeCommand).join("")
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(size.width)} ${formatNumber(size.height)}" preserveAspectRatio="none">${body}</svg>`
    },
  }
}

function canvasBackingSize(node: CanvasHostNode): CanvasSize {
  const bounds = node.getBoundingClientRect()
  return normalizedSize({
    width: finitePositive(Number(node.width)) ?? bounds.width,
    height: finitePositive(Number(node.height)) ?? bounds.height,
  })
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

function cloneCanvasMatrix(matrix: CanvasMatrix): CanvasMatrix {
  return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
}

function isIdentityTransform(matrix: CanvasMatrix): boolean {
  return matrix[0] === 1 && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === 1 && matrix[4] === 0 && matrix[5] === 0
}

function rectanglePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  matrix: CanvasMatrix,
): readonly CanvasPoint[] {
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
  const scaleX = Math.hypot(a, b)
  const scaleY = Math.hypot(c, d)
  const scale = Math.max(0.0001, (scaleX + scaleY) / 2)
  return width * scale
}

function parseCanvasStringPaint(paint: CanvasPaint, property: string): string {
  const serialized = String(paint)
  if (paint !== serialized) {
    throw new Error(`GPUIX Canvas2D compatibility currently supports string ${property} values only`)
  }
  return serialized
}

function isFullCircleArc(startAngle: number, endAngle: number): boolean {
  if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return false
  return Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.000001
}

function parseCanvasFont(value: string): ParsedCanvasFont {
  const match = value.trim().match(/^(?:(normal|bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/)
  if (!match) {
    throw new Error(`GPUIX Canvas2D compatibility cannot represent Canvas font ${JSON.stringify(value)}`)
  }
  const size = Number(match[2])
  const family = match[3]?.trim()
  if (!Number.isFinite(size) || size <= 0 || !family) {
    throw new Error(`GPUIX Canvas2D compatibility cannot represent Canvas font ${JSON.stringify(value)}`)
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

function serializeCommand(command: CanvasCommand): string {
  if (command.kind === "fill-polygon" || command.kind === "stroke-polyline") {
    const points = command.points
      .map(([x, y]) => `${formatNumber(x)},${formatNumber(y)}`)
      .join(" ")
    if (command.kind === "fill-polygon") {
      return `<polygon points="${points}" fill="${escapeXmlAttribute(command.color)}"/>`
    }
    return `<polyline points="${points}" fill="none" stroke="${escapeXmlAttribute(command.color)}" stroke-width="${formatNumber(command.width)}"/>`
  }

  if (command.kind === "fill-circle" || command.kind === "stroke-circle") {
    const transform = serializeSvgMatrix(command.transform)
    if (command.kind === "fill-circle") {
      return `<circle cx="${formatNumber(command.x)}" cy="${formatNumber(command.y)}" r="${formatNumber(command.radius)}" transform="${transform}" fill="${escapeXmlAttribute(command.color)}"/>`
    }
    return `<circle cx="${formatNumber(command.x)}" cy="${formatNumber(command.y)}" r="${formatNumber(command.radius)}" transform="${transform}" fill="none" stroke="${escapeXmlAttribute(command.color)}" stroke-width="${formatNumber(command.width)}"/>`
  }

  const anchor = svgTextAnchor(command.align)
  const baseline = svgDominantBaseline(command.baseline)
  const baselineAttribute = baseline ? ` dominant-baseline="${baseline}"` : ""
  const weightAttribute = command.font.weight ? ` font-weight="${command.font.weight}"` : ""
  return `<text x="${formatNumber(command.x)}" y="${formatNumber(command.y)}" fill="${escapeXmlAttribute(command.color)}" font-size="${formatNumber(command.font.size)}" font-family="${escapeXmlAttribute(command.font.family)}"${weightAttribute} text-anchor="${anchor}"${baselineAttribute}>${escapeXmlText(command.value)}</text>`
}

function serializeSvgMatrix(matrix: CanvasMatrix): string {
  return `matrix(${matrix.map(formatNumber).join(" ")})`
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
