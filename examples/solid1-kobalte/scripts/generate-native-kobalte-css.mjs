import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const examplesDir = path.join(root, "src", "upstream", "kobalte", "examples")
const output = path.join(root, "src", "native-kobalte.generated.ts")
const files = (await readdir(examplesDir)).filter((name) => name.endsWith(".module.css")).sort()
const classes = {}

for (const file of files) {
  const css = await readFile(path.join(examplesDir, file), "utf8")
  const tree = postcss.parse(css, { from: file })
  tree.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return
    for (const selector of rule.selectors ?? [rule.selector]) compileSelector(file, selector.trim(), rule)
  })
}

const source = `import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"\n\nexport const nativeKobalteManifest: NativeStyleManifest = ${JSON.stringify({ classes }, null, 2)}\n`
await writeFile(output, source)
console.log(`native Kobalte CSS manifest: ${Object.keys(classes).length} scoped classes from ${files.length} modules`)

function scopedClass(file, name) {
  const moduleName = file.replace(/\.module\.css$/, "").replace(/[^A-Za-z0-9_-]/g, "_")
  return `kb_${moduleName}_${name}`
}

function compileSelector(file, selector, rule) {
  if (!selector || selector.includes("::")) return
  const classMatches = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)]
  if (classMatches.length === 0) return
  const localClass = classMatches.at(-1)?.[1]
  if (!localClass) return
  const className = scopedClass(file, localClass)
  const entry = classes[className] ??= {}
  const dark = selector.includes('[data-theme*="dark"]')
  const state = selector.includes(":hover") ? "hover"
    : selector.includes(":active") ? "active"
      : selector.includes("[data-highlighted") ? "highlighted"
        : selector.includes('[data-orientation="horizontal"]') ? "orientation-horizontal"
          : selector.includes("[data-disabled]") ? "disabled"
            : selector.includes("[data-expanded") ? "expanded"
              : selector.includes("[data-invalid]") ? "invalid"
                : undefined
  if (selector.includes(":focus-visible") || selector.includes(":first-child") || selector.includes(":last-child") || selector.includes(":not(")) return
  if (classMatches.length > 1 || /[>+~]/.test(selector)) return

  const style = {}
  rule.nodes?.forEach((node) => {
    if (node.type !== "decl") return
    mapDeclaration(style, node.prop, node.value)
  })
  if (Object.keys(style).length === 0) return

  const nativeState = state === "highlighted" ? "hover" : state
  if (nativeState === "hover" || nativeState === "active") {
    const target = dark ? (entry.dark ??= {}) : (entry.base ??= {})
    const existing = target[nativeState]
    target[nativeState] = existing ? { ...existing, ...style } : style
    return
  }
  if (nativeState === "orientation-horizontal") {
    Object.assign(dark ? (entry.dark ??= {}) : (entry.base ??= {}), style)
    return
  }
  if (nativeState) return
  Object.assign(dark ? (entry.dark ??= {}) : (entry.base ??= {}), style)
}

function mapDeclaration(style, property, raw) {
  const value = raw.trim()
  switch (property) {
    case "appearance":
    case "outline":
    case "outline-offset":
    case "transition":
    case "animation":
    case "transform":
    case "transform-origin":
    case "z-index":
    case "vertical-align":
    case "object-fit":
      return
    case "display": style.display = value === "inline-flex" ? "flex" : value; return
    case "align-items": style.alignItems = value; return
    case "justify-content": style.justifyContent = value; return
    case "flex-direction": style.flexDirection = value; return
    case "flex-wrap": style.flexWrap = value; return
    case "gap": style.gap = length(value); return
    case "width": style.width = dimension(value); return
    case "height": style.height = dimension(value); return
    case "min-width": style.minWidth = dimension(value); return
    case "min-height": style.minHeight = dimension(value); return
    case "max-width": {
      const px = [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
      if (px.length) style.maxWidth = Math.max(...px)
      return
    }
    case "max-height": style.maxHeight = dimension(value); return
    case "padding": box(style, "padding", value); return
    case "padding-top": style.paddingTop = length(value); return
    case "padding-right": style.paddingRight = length(value); return
    case "padding-bottom": style.paddingBottom = length(value); return
    case "padding-left": style.paddingLeft = length(value); return
    case "margin": box(style, "margin", value); return
    case "margin-top": style.marginTop = length(value); return
    case "margin-right": if (value !== "auto") style.marginRight = length(value); return
    case "margin-bottom": style.marginBottom = length(value); return
    case "margin-left": if (value !== "auto") style.marginLeft = length(value); return
    case "position": style.position = value === "fixed" ? "absolute" : value; return
    case "inset": if (value === "0") Object.assign(style, { top: 0, right: 0, bottom: 0, left: 0 }); return
    case "top": style.top = length(value); return
    case "right": style.right = length(value); return
    case "bottom": style.bottom = length(value); return
    case "left": style.left = length(value); return
    case "background": style.background = value; return
    case "background-color": style.backgroundColor = value; return
    case "color": style.color = value; return
    case "opacity": style.opacity = Number(value); return
    case "border": border(style, value); return
    case "border-top": border(style, value, "Top"); return
    case "border-color": style.borderColor = value; return
    case "border-width": style.borderWidth = length(value); return
    case "border-radius": style.borderRadius = value.endsWith("%") ? 9999 : length(value); return
    case "font-size": style.fontSize = length(value); return
    case "font-weight": style.fontWeight = Number.isFinite(Number(value)) ? Number(value) : value; return
    case "line-height": style.lineHeight = Number.isFinite(Number(value)) ? Number(value) * (style.fontSize ?? 16) : length(value); return
    case "text-align": style.textAlign = value; return
    case "user-select": style.userSelect = value; return
    case "pointer-events": style.pointerEvents = value; return
    case "overflow": style.overflow = value; return
    case "flex": {
      const [grow, shrink, basis] = value.split(/\s+/)
      if (Number.isFinite(Number(grow))) style.flexGrow = Number(grow)
      if (Number.isFinite(Number(shrink))) style.flexShrink = Number(shrink)
      if (basis) style.flexBasis = length(basis)
      return
    }
    case "box-shadow": return
    default: return
  }
}

function dimension(value) {
  if (value === "auto" || value.endsWith("%")) return value
  return length(value)
}
function length(value) {
  if (value === "0") return 0
  const px = value.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (px) return Number(px[1])
  const rem = value.match(/^(-?\d+(?:\.\d+)?)rem$/)
  if (rem) return Number(rem[1]) * 16
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
function box(style, prefix, value) {
  const parts = value.split(/\s+/).map(length)
  if (!parts.length) return
  const [a, b = a, c = a, d = b] = parts
  if (a === b && b === c && c === d) style[prefix] = a
  else Object.assign(style, { [`${prefix}Top`]: a, [`${prefix}Right`]: b, [`${prefix}Bottom`]: c, [`${prefix}Left`]: d })
}
function border(style, value, side = "") {
  const parts = value.split(/\s+/)
  const width = parts.find((part) => part.endsWith("px") || part === "0")
  const functionalColor = value.match(/(?:oklch|hsla?|rgba?)\([^)]*\)/i)?.[0]
  const hexColor = value.match(/#[0-9a-f]{3,8}\b/i)?.[0]
  const namedColor = parts.find((part) => /^[a-z]+$/i.test(part) && part !== "solid" && part !== "dashed" && part !== "none")
  const color = functionalColor ?? hexColor ?? namedColor
  if (width) style[`border${side}Width`] = length(width)
  if (color) style.borderColor = color
}
