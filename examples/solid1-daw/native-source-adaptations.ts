import type { Plugin } from "vite"

const UPSTREAM_MARKER = "/examples/solid1-daw/src/upstream/"
const PLACEHOLDER_IMPORT = 'import NativeWaveformSvg from "@solid1-daw/native-waveform";\n'
const OPEN_CANVAS = /<canvas(?=[\s/>])/g
const CLOSE_CANVAS = /<\/canvas>/g

export function adaptDawNativeSource(code: string, id: string): string | undefined {
  const normalizedId = id.replaceAll("\\", "/").split("?", 1)[0] ?? id
  if (!normalizedId.includes(UPSTREAM_MARKER) || !normalizedId.endsWith(".tsx")) return undefined
  if (!OPEN_CANVAS.test(code)) {
    OPEN_CANVAS.lastIndex = 0
    return undefined
  }
  OPEN_CANVAS.lastIndex = 0
  const adapted = code
    .replace(OPEN_CANVAS, "<NativeWaveformSvg")
    .replace(CLOSE_CANVAS, "</NativeWaveformSvg>")
  return `${PLACEHOLDER_IMPORT}${adapted}`
}

export function dawNativeSourceAdaptations(): Plugin {
  return {
    name: "solid1-daw-native-source-adaptations",
    enforce: "pre",
    transform(code, id) {
      const adapted = adaptDawNativeSource(code, id)
      return adapted === undefined ? null : { code: adapted, map: null }
    },
  }
}
