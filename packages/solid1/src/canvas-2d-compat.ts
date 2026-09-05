import {
  HostElementNode,
  createHostElement,
  insertHostNode,
  setHostProperty,
} from "./host/nodes.js"
import type { StyleDesc } from "./host/types.js"
import { normalizeNativeStyleColors } from "./native-style.js"

type CanvasPoint = readonly [number, number]
type CanvasMatrix = readonly [number, number, number, number, number, number]
type CanvasSize = { width: number; height: number }
type CanvasPaint = CanvasRenderingContext2D["fillStyle"]
type CanvasHostDimensions = HostElementNode & { width?: number; height?: number }
type CanvasCommand =
  | { kind: "fill"; points: readonly CanvasPoint[]; color: string }
  | { kind: "stroke"; points: readonly CanvasPoint[]; color: string; width: number }

export interface Canvas2DCompatSurface {
  readonly context: CanvasRenderingContext2D
  toSvg(): string
}

export function createCanvas2DCompatSurface(
  getSize: () => CanvasSize,
  onChange: () => void = () => undefined,
): Canvas2DCompatSurface {
  let commands: CanvasCommand[] = []
  let path: CanvasPoint[] = []
  let transform: CanvasMatrix = [1, 0, 0, 1, 0, 0]
  let fillStyle: CanvasPaint = "#000000"
  let strokeStyle: CanvasPaint = "#000000"
  let lineWidth = 1
  let imageSmoothingEnabled = true

  // SAFETY: This retained compatibility context intentionally implements only the Canvas2D operations exercised by the pinned DAW source; unsupported APIs remain absent rather than being approximated.
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
        color: normalizeCanvasPaint(fillStyle),
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
        color: normalizeCanvasPaint(strokeStyle),
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

type RuntimeCanvasState = {
  surface: HostElementNode
  compat: Canvas2DCompatSurface
  queued: boolean
}

const runtimeCanvases = new WeakMap<HostElementNode, RuntimeCanvasState>()
const fallbackGetContext = HostElementNode.prototype.getContext

Object.defineProperty(HostElementNode.prototype, "getContext", {
  configurable: true,
  value(this: HostElementNode, contextId: string): CanvasRenderingContext2D | null {
    if (this.localName !== "canvas" || contextId !== "2d" || !this.nativeAlive || !this.root) {
      return fallbackGetContext.call(this, contextId)
    }

    let state = runtimeCanvases.get(this)
    if (!state) {
      if (this.style.position === undefined) {
        setHostProperty(this, "style", { ...this.style, position: "relative" })
      }
      const surface = createHostElement("svg", "svg")
      let nextState: RuntimeCanvasState | undefined
      const compat = createCanvas2DCompatSurface(
        () => canvasBackingSize(this),
        () => {
          if (nextState) scheduleRuntimeCanvasRender(this, nextState)
        },
      )
      nextState = { surface, compat, queued: false }
      state = nextState
      runtimeCanvases.set(this, state)
      insertHostNode(this, surface)
      scheduleRuntimeCanvasRender(this, state)
    }
    return state.compat.context
  },
})

function scheduleRuntimeCanvasRender(node: HostElementNode, state: RuntimeCanvasState): void {
  if (state.queued) return
  state.queued = true
  queueMicrotask(() => {
    state.queued = false
    if (!node.nativeAlive || !node.root || !state.surface.nativeAlive) return
    const bounds = node.getBoundingClientRect()
    const style: StyleDesc = {
      position: "absolute",
      top: 0,
      left: 0,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
      pointerEvents: "none",
      flexShrink: 0,
    }
    setHostProperty(state.surface, "style", style)
    const source = state.compat.toSvg()
    setHostProperty(state.surface, "source", source)
    setHostProperty(state.surface, "src", `data:image/svg+xml,${encodeURIComponent(source)}`)
  })
}

function canvasBackingSize(node: HostElementNode): CanvasSize {
  // SAFETY: Browser canvas source assigns numeric width/height properties directly on this semantic host node before drawing; this named contract exposes only those two authored dimensions.
  const canvas = node as CanvasHostDimensions
  const bounds = node.getBoundingClientRect()
  return normalizedSize({
    width: finitePositive(Number(canvas.width)) ?? bounds.width,
    height: finitePositive(Number(canvas.height)) ?? bounds.height,
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

function normalizeCanvasPaint(value: CanvasPaint): string {
  const color = String(value)
  return normalizeNativeStyleColors({ color })?.color ?? color
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
