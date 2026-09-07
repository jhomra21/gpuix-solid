import {
  createElement as createNativeElement,
  getNativeStyleColorMode,
  insert as insertNative,
  insertNode as insertNativeNode,
  setProp as setNativeProp,
} from "@jhomra21/gpuix-solid1"
import type { LinearGradientBackground } from "@jhomra21/gpuix-solid1"

export * from "@jhomra21/gpuix-solid1"

type CanvasPoint = readonly [number, number]
type CanvasMatrix = readonly [number, number, number, number, number, number]
type CanvasSize = { width: number; height: number }
type CanvasPaint = CanvasRenderingContext2D["fillStyle"]
type NativeHostNode = ReturnType<typeof createNativeElement>
type NativeHostElement = Extract<NativeHostNode, { kind: "element" }>
type CanvasHostNode = NativeHostElement & {
  width?: number
  height?: number
}
type CanvasCommand =
  | { kind: "fill"; points: readonly CanvasPoint[]; color: string }
  | { kind: "stroke"; points: readonly CanvasPoint[]; color: string; width: number }

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
type CssVariableHostStyle = NativeHostElement["style"] & {
  [property: `--${string}`]: CssVariableValue
}

type GradientColors = {
  from: string
  to: string
}

export type CssVariableLinearGradientCompat = {
  property: `--${string}`
  angle: number
  colorSpace?: "srgb" | "oklab"
  light: GradientColors
  dark: GradientColors
}

const runtimeCanvases = new WeakMap<CanvasHostNode, RuntimeCanvasState>()
const cssVariableGradients = new Map<`--${string}`, CssVariableLinearGradientCompat>()

function requireHostElement(node: NativeHostNode, tagName: string): NativeHostElement {
  if (node.kind !== "element") {
    throw new Error(`GPUIX Solid compatibility expected <${tagName}> to create a host element`)
  }
  return node
}

export function registerCssVariableLinearGradient(config: CssVariableLinearGradientCompat): void {
  cssVariableGradients.set(config.property, config)
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
  setNativeProp(node, name, value, previous)
  if (node.kind === "element") reapplyCompatStyleSubtree(node)
}

export function insertNode(
  parent: Parameters<typeof insertNativeNode>[0],
  node: Parameters<typeof insertNativeNode>[1],
  anchor?: Parameters<typeof insertNativeNode>[2],
): void {
  insertNativeNode(parent, node, anchor)
  if (node.kind === "element") reapplyCompatStyleSubtree(node)
}

export function insert(...args: Parameters<typeof insertNative>): ReturnType<typeof insertNative> {
  const result = insertNative(...args)
  reapplyCompatStylesAfterInsert(args[0])
  return result
}

function reapplyCompatStylesAfterInsert(parent: Parameters<typeof insertNative>[0]): void {
  if (parent.kind === "element") {
    reapplyCompatStyleSubtree(parent)
    return
  }
  if (parent.kind !== "root") return
  for (const child of parent.children) {
    if (child.kind === "element") reapplyCompatStyleSubtree(child)
  }
}

function reapplyCompatStyleSubtree(node: NativeHostElement): void {
  applyRegisteredCssVariableGradient(node)
  for (const child of node.children) {
    if (child.kind === "element") reapplyCompatStyleSubtree(child)
  }
}

function applyRegisteredCssVariableGradient(node: NativeHostElement): void {
  // SAFETY: the Solid universal style normalizer preserves CSS custom-property
  // keys verbatim on the host style object; this view narrows only those keys
  // to the scalar CSS values emitted by the copied DAW source.
  const style = node.style as CssVariableHostStyle
  let gradient: LinearGradientBackground | undefined
  let appliedProperty: `--${string}` | undefined
  for (const [property, config] of cssVariableGradients) {
    const position = cssUnitInterval(style[property])
    if (position === undefined) continue
    const colors = getNativeStyleColorMode() === "dark" ? config.dark : config.light
    gradient = {
      type: "linear-gradient",
      angle: config.angle,
      stops: [
        { color: colors.from, position },
        { color: colors.to, position },
      ],
      colorSpace: config.colorSpace,
    }
    appliedProperty = property
  }
  if (!gradient || !appliedProperty) return

  style.background = gradient
  delete style.backgroundColor
  delete style[appliedProperty]
  if (node.root && node.nativeAlive) {
    node.root.driver.enqueue("setStyle", node.id, style)
  }
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
  let path: CanvasPoint[] = []
  let transform: CanvasMatrix = [1, 0, 0, 1, 0, 0]
  let fillStyle: CanvasPaint = "#000000"
  let strokeStyle: CanvasPaint = "#000000"
  let lineWidth = 1
  let imageSmoothingEnabled = true

  // SAFETY: this compatibility context intentionally implements only the
  // Canvas2D operations exercised by the pinned DAW source. Unsupported APIs
  // stay absent rather than being silently approximated.
  const context = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: CanvasPaint) {
      fillStyle = value
    },
    get strokeStyle() {
      return strokeStyle
    },
    set strokeStyle(value: CanvasPaint) {
      strokeStyle = value
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
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
      transform = [a, b, c, d, e, f]
    },
    clearRect(x: number, y: number, width: number, height: number) {
      const points = rectanglePoints(x, y, width, height, transform)
      if (!coversSurface(points, getSize())) {
        throw new Error("GPUIX Canvas2D compatibility currently supports only full-surface clearRect()")
      }
      commands = []
      path = []
      onChange()
    },
    fillRect(x: number, y: number, width: number, height: number) {
      commands.push({
        kind: "fill",
        points: rectanglePoints(x, y, width, height, transform),
        color: String(fillStyle),
      })
      onChange()
    },
    beginPath() {
      path = []
    },
    moveTo(x: number, y: number) {
      path = [transformPoint(x, y, transform)]
    },
    lineTo(x: number, y: number) {
      path.push(transformPoint(x, y, transform))
    },
    stroke() {
      if (path.length < 2) return
      commands.push({
        kind: "stroke",
        points: [...path],
        color: String(strokeStyle),
        width: transformedLineWidth(lineWidth, transform),
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

function serializeCommand(command: CanvasCommand): string {
  const points = command.points
    .map(([x, y]) => `${formatNumber(x)},${formatNumber(y)}`)
    .join(" ")
  if (command.kind === "fill") {
    return `<polygon points="${points}" fill="${escapeXmlAttribute(command.color)}"/>`
  }
  return `<polyline points="${points}" fill="none" stroke="${escapeXmlAttribute(command.color)}" stroke-width="${formatNumber(command.width)}"/>`
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
