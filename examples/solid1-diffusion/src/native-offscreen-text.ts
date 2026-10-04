type NativeTextMeasurer = {
  measureCanvasText(text: string, fontSize: number, fontFamily: string, fontWeight: number): number
}

type Measurable2DContext = {
  font: string
  textBaseline: CanvasTextBaseline
  letterSpacing: string
  measureText(text: string): TextMetrics
}

function parseFont(font: string) {
  const match = /(?:^|\s)(\d+(?:\.\d+)?)px\s+(.+)$/.exec(font)
  if (!match) throw new TypeError(`Unsupported Diffusion text-measurement font: ${font}`)

  const size = Number(match[1])
  const prefix = font.slice(0, match.index + match[0].indexOf(match[1])).trim()
  const weightToken = prefix.split(/\s+/).find((token) => /^(?:[1-9]\d{2}|normal|bold)$/.test(token))
  const weight = weightToken === "bold" ? 700 : weightToken === "normal" || !weightToken ? 400 : Number(weightToken)
  const family = match[2].trim().replace(/^(['"])(.*)\1$/, "$2")
  return { size, family, weight }
}

function createMeasureContext(measurer: NativeTextMeasurer): Measurable2DContext {
  return {
    font: "normal 400 16px sans-serif",
    textBaseline: "alphabetic",
    letterSpacing: "0px",
    measureText(text): TextMetrics {
      const { size, family, weight } = parseFont(this.font)
      const width = measurer.measureCanvasText(String(text), size, family, weight)

      // The current GPUIX native measurement API returns advance width only.
      // Supply stable em-box metrics for Diffusion's one-line text autosizing;
      // glyph advance itself remains measured by GPUI's native text system.
      return {
        width,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        actualBoundingBoxAscent: size * 0.8,
        actualBoundingBoxDescent: size * 0.2,
        fontBoundingBoxAscent: size * 0.8,
        fontBoundingBoxDescent: size * 0.2,
        emHeightAscent: size * 0.8,
        emHeightDescent: size * 0.2,
        hangingBaseline: -size * 0.8,
        alphabeticBaseline: 0,
        ideographicBaseline: size * 0.2,
      }
    },
  }
}

class NativeMeasureOffscreenCanvas {
  readonly #context: Measurable2DContext
  width: number
  height: number

  constructor(width: number, height: number, measurer: NativeTextMeasurer) {
    this.width = width
    this.height = height
    this.#context = createMeasureContext(measurer)
  }

  getContext(contextId: string): Measurable2DContext | null {
    if (contextId !== "2d") return null
    return this.#context
  }
}

/** Install the narrow OffscreenCanvas measurement surface used by Diffusion text layout. */
export function installNativeOffscreenTextMeasurement(measurer: NativeTextMeasurer): void {
  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    writable: true,
    value: class extends NativeMeasureOffscreenCanvas {
      constructor(width: number, height: number) {
        super(width, height, measurer)
      }
    },
  })
}
