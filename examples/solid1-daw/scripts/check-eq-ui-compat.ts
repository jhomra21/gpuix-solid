import "../src/compat/eq-visual-audio"
import { useAppPreferences } from "../src/compat/app-preferences"
import {
  parseTwoRowGridDefinition,
  placeTwoRowGridItems,
  twoRowGridItemStyle,
} from "../src/compat/two-row-grid-layout"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const definition = parseTwoRowGridDefinition(
  "72px minmax(220px, 1fr) 72px",
  "minmax(0, 1fr) 52px",
)
requireCondition(definition?.leftWidth === 72, "EQ grid should preserve the 72px left rail")
requireCondition(definition?.rightWidth === 72, "EQ grid should preserve the 72px right rail")
requireCondition(definition?.bottomHeight === 52, "EQ grid should preserve the 52px band strip")

const placements = placeTwoRowGridItems([2, 1, 2, 1])
requireCondition(placements?.length === 4, "EQ grid should place all four source children")
requireCondition(placements?.[0]?.column === 0 && placements[0].rowSpan === 2, "left rail should span both rows")
requireCondition(placements?.[1]?.column === 1 && placements[1].row === 0, "graph should occupy the center top cell")
requireCondition(placements?.[2]?.column === 2 && placements[2].rowSpan === 2, "right rail should span both rows")
requireCondition(placements?.[3]?.column === 1 && placements[3].row === 1, "band strip should occupy the source center bottom cell")

if (!definition || !placements) throw new Error("EQ grid detector requires parsed source geometry")
const graphStyle = twoRowGridItemStyle(definition, placements[1]!)
const bandStyle = twoRowGridItemStyle(definition, placements[3]!)
requireCondition(graphStyle.left === 72 && graphStyle.right === 72 && graphStyle.bottom === 52, "graph geometry should leave both rails and the source bottom row intact")
requireCondition(bandStyle.left === 72 && bandStyle.right === 72 && bandStyle.height === 52, "band strip geometry should preserve the source center width and row height")
requireCondition(
  parseTwoRowGridDefinition("repeat(3, 1fr)", "1fr 52px") === undefined,
  "unsupported grid syntax must fail closed",
)

const eqThemeTokens = useAppPreferences().appearance.themeTokens()
const expectedEqThemeTokens = {
  "muted-foreground": "#9f9fa9",
  "meter-safe": "#00a76c",
  "meter-clipping": "#f53e39",
  "clip-selected": "#e6ad00",
  "device-graph-background": "#040405",
  "device-graph-grid": "#ffffff29",
  "device-graph-accent": "#00c3db",
} as const
for (const [token, expected] of Object.entries(expectedEqThemeTokens)) {
  requireCondition(
    eqThemeTokens[token as keyof typeof eqThemeTokens] === expected,
    `EQ theme token ${token} should use the exact pinned-source dark sRGB translation`,
  )
}

const responseContext = new OfflineAudioContext(1, 1, 44100)
const filter = responseContext.createBiquadFilter()
const frequencies = new Float32Array([100, 1000, 10000])
const magnitudes = new Float32Array(frequencies.length)
const phases = new Float32Array(frequencies.length)
filter.type = "peaking"
filter.frequency.value = 1000
filter.Q.value = 1
filter.gain.value = 12
filter.getFrequencyResponse(frequencies, magnitudes, phases)
requireCondition(magnitudes.every(Number.isFinite), "fake EQ response magnitudes should stay finite")
requireCondition(phases.every(Number.isFinite), "fake EQ response phases should stay finite")
requireCondition((magnitudes[1] ?? 0) > (magnitudes[0] ?? 0), "positive peaking gain should visibly lift the center frequency")
requireCondition((magnitudes[1] ?? 0) > (magnitudes[2] ?? 0), "positive peaking gain should remain centered around its frequency")

filter.type = "lowpass"
filter.frequency.value = 1000
filter.Q.value = 0.707
filter.gain.value = 0
filter.getFrequencyResponse(frequencies, magnitudes, phases)
requireCondition((magnitudes[0] ?? 0) > (magnitudes[2] ?? 0), "lowpass visual response should attenuate high frequencies")

console.log("DAW EQ UI compatibility: passed")
