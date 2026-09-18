import type { CursorValue, StyleDesc } from "./host/types.js"

export interface NativeUtilityParseResult {
  style: StyleDesc
  unknown: string[]
}

const shades = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const

const palette = new Map<string, readonly string[]>([
  ["slate", ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a", "#020617"]],
  ["gray", ["#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827", "#030712"]],
  ["zinc", ["#fafafa", "#f4f4f5", "#e4e4e7", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46", "#27272a", "#18181b", "#09090b"]],
  ["neutral", ["#fafafa", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#404040", "#262626", "#171717", "#0a0a0a"]],
  ["stone", ["#fafaf9", "#f5f5f4", "#e7e5e4", "#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#44403c", "#292524", "#1c1917", "#0c0a09"]],
  ["red", ["#fef2f2", "#fee2e2", "#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#450a0a"]],
  ["orange", ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12", "#431407"]],
  ["amber", ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f", "#451a03"]],
  ["yellow", ["#fefce8", "#fef9c3", "#fef08a", "#fde047", "#facc15", "#eab308", "#ca8a04", "#a16207", "#854d0e", "#713f12", "#422006"]],
  ["lime", ["#f7fee7", "#ecfccb", "#d9f99d", "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f", "#3f6212", "#365314", "#1a2e05"]],
  ["green", ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#052e16"]],
  ["emerald", ["#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#022c22"]],
  ["teal", ["#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a", "#042f2e"]],
  ["cyan", ["#ecfeff", "#cffafe", "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63", "#083344"]],
  ["sky", ["#f0f9ff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e", "#082f49"]],
  ["blue", ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a", "#172554"]],
  ["indigo", ["#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81", "#1e1b4b"]],
  ["violet", ["#f5f3ff", "#ede9fe", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95", "#2e1065"]],
  ["purple", ["#faf5ff", "#f3e8ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#7e22ce", "#6b21a8", "#581c87", "#3b0764"]],
  ["fuchsia", ["#fdf4ff", "#fae8ff", "#f5d0fe", "#f0abfc", "#e879f9", "#d946ef", "#c026d3", "#a21caf", "#86198f", "#701a75", "#4a044e"]],
  ["pink", ["#fdf2f8", "#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d", "#831843", "#500724"]],
  ["rose", ["#fff1f2", "#ffe4e6", "#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239", "#881337", "#4c0519"]],
])

const textSizes = new Map<string, number>([
  ["xs", 12],
  ["sm", 14],
  ["base", 16],
  ["lg", 18],
  ["xl", 20],
  ["2xl", 24],
  ["3xl", 30],
  ["4xl", 36],
  ["5xl", 48],
  ["6xl", 60],
  ["7xl", 72],
  ["8xl", 96],
  ["9xl", 128],
])

const fontWeights = new Map<string, number>([
  ["thin", 100],
  ["extralight", 200],
  ["light", 300],
  ["normal", 400],
  ["medium", 500],
  ["semibold", 600],
  ["bold", 700],
  ["extrabold", 800],
  ["black", 900],
])

const radii = new Map<string, number>([
  ["none", 0],
  ["sm", 2],
  ["md", 6],
  ["lg", 8],
  ["xl", 12],
  ["2xl", 16],
  ["3xl", 24],
  ["full", 9999],
])

function parseLength(value: string): number | string | undefined {
  if (value === "px") return 1
  if (value === "full") return "100%"
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1)
    const match = inner.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|%)?$/)
    if (!match) return undefined
    const amount = Number(match[1])
    if (!Number.isFinite(amount)) return undefined
    if (match[2] === "rem") return amount * 16
    if (match[2] === "%") return `${amount}%`
    return amount
  }
  if (!/^\d*\.?\d+$/.test(value)) return undefined
  const amount = Number(value)
  return Number.isFinite(amount) ? amount * 4 : undefined
}

function parseNumericLength(value: string): number | undefined {
  const parsed = parseLength(value)
  const number = Number(parsed)
  return Number.isFinite(number) ? number : undefined
}

function parseColor(value: string): string | undefined {
  if (value === "white") return "#ffffff"
  if (value === "black") return "#000000"
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1)
    if (/^#[0-9a-f]{3,4}$/i.test(inner) || /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(inner)) {
      return inner.toLowerCase()
    }
    return undefined
  }

  const split = value.lastIndexOf("-")
  if (split <= 0) return undefined
  const hue = value.slice(0, split)
  const shade = value.slice(split + 1)
  const row = palette.get(hue)
  const shadeIndex = shades.findIndex((candidate) => candidate === shade)
  return shadeIndex < 0 ? undefined : row?.[shadeIndex]
}

function setBoxSpacing(
  style: StyleDesc,
  family: string,
  axis: string,
  value: number,
): void {
  if (family === "p") {
    if (axis === "") style.padding = value
    else if (axis === "x") {
      style.paddingLeft = value
      style.paddingRight = value
    } else if (axis === "y") {
      style.paddingTop = value
      style.paddingBottom = value
    } else if (axis === "t") style.paddingTop = value
    else if (axis === "r") style.paddingRight = value
    else if (axis === "b") style.paddingBottom = value
    else if (axis === "l") style.paddingLeft = value
    return
  }

  if (axis === "") style.margin = value
  else if (axis === "x") {
    style.marginLeft = value
    style.marginRight = value
  } else if (axis === "y") {
    style.marginTop = value
    style.marginBottom = value
  } else if (axis === "t") style.marginTop = value
  else if (axis === "r") style.marginRight = value
  else if (axis === "b") style.marginBottom = value
  else if (axis === "l") style.marginLeft = value
}

function parseSpacing(style: StyleDesc, token: string): boolean {
  const match = token.match(/^(-)?([pm])([xytblr]?)-(.+)$/)
  if (!match) return false
  const negative = match[1] === "-"
  const family = match[2] ?? ""
  const axis = match[3] ?? ""
  if (negative && family !== "m") return false
  const parsed = parseNumericLength(match[4] ?? "")
  if (parsed === undefined) return false
  setBoxSpacing(style, family, axis, negative ? -parsed : parsed)
  return true
}

function parseSizing(style: StyleDesc, token: string): boolean {
  const parsed = (
    token.startsWith("min-w-") ? ["minWidth", token.slice(6)] :
    token.startsWith("min-h-") ? ["minHeight", token.slice(6)] :
    token.startsWith("max-w-") ? ["maxWidth", token.slice(6)] :
    token.startsWith("max-h-") ? ["maxHeight", token.slice(6)] :
    token.startsWith("w-") ? ["width", token.slice(2)] :
    token.startsWith("h-") ? ["height", token.slice(2)] :
    undefined
  )
  if (parsed) {
    const value = parseLength(parsed[1] ?? "")
    if (value === undefined) return false
    const key = parsed[0]
    if (key === "minWidth") style.minWidth = value
    else if (key === "minHeight") style.minHeight = value
    else if (key === "maxWidth") style.maxWidth = value
    else if (key === "maxHeight") style.maxHeight = value
    else if (key === "width") style.width = value
    else if (key === "height") style.height = value
    return true
  }

  if (!token.startsWith("size-")) return false
  const value = parseLength(token.slice(5))
  if (value === undefined) return false
  style.width = value
  style.height = value
  return true
}

function layoutStyle(token: string): StyleDesc | undefined {
  switch (token) {
    case "flex": return { display: "flex" }
    case "flex-row": return { display: "flex", flexDirection: "row" }
    case "flex-col": return { display: "flex", flexDirection: "column" }
    case "flex-wrap": return { flexWrap: "wrap" }
    case "items-start": return { alignItems: "flex-start" }
    case "items-center": return { alignItems: "center" }
    case "items-end": return { alignItems: "flex-end" }
    case "items-stretch": return { alignItems: "stretch" }
    case "justify-start": return { justifyContent: "flex-start" }
    case "justify-center": return { justifyContent: "center" }
    case "justify-end": return { justifyContent: "flex-end" }
    case "justify-between": return { justifyContent: "space-between" }
    case "flex-1": return { flexGrow: 1, flexShrink: 1, flexBasis: 0 }
    case "grow": return { flexGrow: 1 }
    case "grow-0": return { flexGrow: 0 }
    case "shrink": return { flexShrink: 1 }
    case "shrink-0": return { flexShrink: 0 }
    default: return undefined
  }
}

function cursorValue(value: string): CursorValue | undefined {
  switch (value) {
    case "default":
    case "auto":
    case "pointer":
    case "text":
    case "crosshair":
    case "grab":
    case "grabbing":
    case "move":
    case "col-resize":
    case "row-resize":
    case "not-allowed":
      return value
    default:
      return undefined
  }
}

function parseToken(token: string): StyleDesc | undefined {
  const layout = layoutStyle(token)
  if (layout) return layout

  const style: StyleDesc = {}
  if (parseSpacing(style, token) || parseSizing(style, token)) return style

  if (token.startsWith("gap-")) {
    const value = parseNumericLength(token.slice(4))
    return value === undefined ? undefined : { gap: value }
  }
  if (token.startsWith("gap-x-")) {
    const value = parseNumericLength(token.slice(6))
    return value === undefined ? undefined : { columnGap: value }
  }
  if (token.startsWith("gap-y-")) {
    const value = parseNumericLength(token.slice(6))
    return value === undefined ? undefined : { rowGap: value }
  }

  if (token.startsWith("bg-")) {
    const color = parseColor(token.slice(3))
    return color ? { backgroundColor: color } : undefined
  }
  if (token.startsWith("text-")) {
    const value = token.slice(5)
    const color = parseColor(value)
    if (color) return { color }
    const size = value.startsWith("[") ? parseNumericLength(value) : textSizes.get(value)
    return size === undefined ? undefined : { fontSize: size }
  }
  if (token.startsWith("font-")) {
    const weight = fontWeights.get(token.slice(5))
    return weight === undefined ? undefined : { fontWeight: weight }
  }

  if (token === "rounded") return { borderRadius: 4 }
  if (token.startsWith("rounded-")) {
    const value = token.slice(8)
    const radius = value.startsWith("[") ? parseNumericLength(value) : radii.get(value)
    return radius === undefined ? undefined : { borderRadius: radius }
  }

  if (token.startsWith("opacity-")) {
    const amount = Number(token.slice(8))
    if (!Number.isInteger(amount) || amount < 0 || amount > 100) return undefined
    return { opacity: amount / 100 }
  }

  if (token.startsWith("cursor-")) {
    const cursor = cursorValue(token.slice(7))
    return cursor ? { cursor } : undefined
  }

  return undefined
}

export function parseNativeUtilities(input: string): NativeUtilityParseResult {
  const style: StyleDesc = {}
  const unknown: string[] = []

  for (const raw of input.split(/\s+/).filter(Boolean)) {
    let token = raw
    let variant = ""
    if (raw.startsWith("hover:")) {
      variant = "hover"
      token = raw.slice(6)
    } else if (raw.startsWith("active:")) {
      variant = "active"
      token = raw.slice(7)
    } else if (raw.includes(":")) {
      unknown.push(raw)
      continue
    }

    const parsed = parseToken(token)
    if (!parsed) {
      unknown.push(raw)
      continue
    }

    if (variant === "") Object.assign(style, parsed)
    else if (variant === "hover") style.hover = { ...style.hover, ...parsed }
    else style.active = { ...style.active, ...parsed }
  }

  return { style, unknown }
}
