import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "@tailwindcss/node"
import postcss from "postcss"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const themePath = path.join(projectRoot, "src/theme.css")
const candidatesPath = path.join(projectRoot, "native-tailwind.candidates.json")
const outputPath = path.join(projectRoot, "src/native-tailwind.generated.ts")

const themeCss = await readFile(themePath, "utf8")
const candidates = JSON.parse(await readFile(candidatesPath, "utf8"))
if (!Array.isArray(candidates) || !candidates.every((candidate) => typeof candidate === "string")) {
  throw new Error("native-tailwind.candidates.json must contain only strings")
}

const compiler = await compile(themeCss, {
  base: projectRoot,
  from: themePath,
  onDependency() {},
})
const compiledCss = compiler.build(candidates)
const root = postcss.parse(compiledCss, { from: themePath })
const variables = collectThemeVariables(root)
const classes = {}

for (const candidate of candidates) {
  const rule = findCandidateRule(root, candidate)
  if (!rule) throw new Error(`Tailwind did not emit candidate ${JSON.stringify(candidate)}`)

  const light = compileRule(rule, candidate, variables.light)
  const dark = compileRule(rule, candidate, variables.dark)
  classes[candidate] = JSON.stringify(light) === JSON.stringify(dark)
    ? { base: light }
    : { light, dark }
}

const generated = `import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"\n\n` +
  `export const nativeTailwindManifest: NativeStyleManifest = ${JSON.stringify({ classes }, null, 2)}\n`

await writeFile(outputPath, generated)
console.log(`native Tailwind manifest: ${candidates.length} candidates`)

function collectThemeVariables(rootNode) {
  const light = {}
  const darkOverrides = {}

  rootNode.walkRules((rule) => {
    const selector = rule.selector
    const target = selector.includes(".dark") || selector.includes('[data-kb-theme="dark"]')
      ? darkOverrides
      : selector.includes(":root") || selector.includes(":host")
        ? light
        : undefined
    if (!target) return

    rule.nodes?.forEach((node) => {
      if (node.type === "decl" && node.prop.startsWith("--")) target[node.prop] = node.value
    })
  })

  return { light, dark: { ...light, ...darkOverrides } }
}

function findCandidateRule(rootNode, candidate) {
  const classSelector = `.${escapeCssIdentifier(candidate)}`
  let found
  rootNode.walkRules((rule) => {
    if (!found && rule.selector.split(",").some((selector) => selector.trim().startsWith(classSelector))) {
      found = rule
    }
  })
  return found
}

function compileRule(rule, candidate, themeVariables) {
  const localVariables = {}
  rule.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--")) localVariables[declaration.prop] = declaration.value
  })

  const base = {}
  const hover = {}
  const active = {}

  rule.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--")) return
    const state = declarationState(declaration, rule, candidate)
    const target = state === "hover" ? hover : state === "active" ? active : base
    const value = resolveCssValue(declaration.value, { ...themeVariables, ...localVariables })
    mapDeclaration(target, declaration.prop, value, candidate)
  })

  const result = { ...base }
  if (Object.keys(hover).length > 0) result.hover = hover
  if (Object.keys(active).length > 0) result.active = active
  if (Object.keys(result).length === 0) throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)
  return result
}

function declarationState(declaration, candidateRule, candidate) {
  let state = "base"
  let node = declaration.parent

  while (node) {
    if (node.type === "rule") {
      const selectorState = stateFromSelector(node.selector)
      if (selectorState) state = mergeState(state, selectorState, candidate)
    } else if (node.type === "atrule" && node.name === "media") {
      if (!/^\(hover:\s*hover\)$/.test(node.params.trim())) {
        throw new Error(`Unsupported Tailwind media variant for ${JSON.stringify(candidate)}: @media ${node.params}`)
      }
    }
    if (node === candidateRule) break
    node = node.parent
  }

  return state
}

function stateFromSelector(selector) {
  const states = new Set()
  if (/(^|[^\\]):hover\b/.test(selector)) states.add("hover")
  if (/(^|[^\\]):active\b/.test(selector)) states.add("active")

  const unsupported = ["focus", "focus-visible", "disabled", "checked"]
  for (const pseudo of unsupported) {
    const pattern = new RegExp(`(^|[^\\\\]):${pseudo.replace("-", "\\-")}\\b`)
    if (pattern.test(selector)) throw new Error(`Unsupported native Tailwind state variant :${pseudo}`)
  }

  if (states.size > 1) throw new Error(`Unsupported combined native Tailwind states in selector ${JSON.stringify(selector)}`)
  return states.values().next().value
}

function mergeState(current, next, candidate) {
  if (current === "base" || current === next) return next
  throw new Error(`Unsupported combined Tailwind state variants for ${JSON.stringify(candidate)}: ${current} + ${next}`)
}

function mapDeclaration(style, property, rawValue, candidate) {
  const value = rawValue.trim()
  switch (property) {
    case "display":
      style.display = value === "inline-flex" ? "flex" : value
      return
    case "align-items": style.alignItems = value; return
    case "align-self": style.alignSelf = value; return
    case "align-content": style.alignContent = value; return
    case "justify-content": style.justifyContent = value; return
    case "flex-direction": style.flexDirection = value; return
    case "flex-wrap": style.flexWrap = value; return
    case "flex-grow": style.flexGrow = numberValue(value, property, candidate); return
    case "flex-shrink": style.flexShrink = numberValue(value, property, candidate); return
    case "flex-basis": style.flexBasis = lengthValue(value, property, candidate); return
    case "gap": style.gap = lengthValue(value, property, candidate); return
    case "row-gap": style.rowGap = lengthValue(value, property, candidate); return
    case "column-gap": style.columnGap = lengthValue(value, property, candidate); return
    case "width": style.width = dimensionValue(value, property, candidate); return
    case "height": style.height = dimensionValue(value, property, candidate); return
    case "min-width": style.minWidth = dimensionValue(value, property, candidate); return
    case "min-height": style.minHeight = dimensionValue(value, property, candidate); return
    case "max-width": style.maxWidth = dimensionValue(value, property, candidate); return
    case "max-height": style.maxHeight = dimensionValue(value, property, candidate); return
    case "padding": applyBoxShorthand(style, "padding", value, candidate); return
    case "padding-inline": applyPair(style, "paddingLeft", "paddingRight", value, property, candidate); return
    case "padding-block": applyPair(style, "paddingTop", "paddingBottom", value, property, candidate); return
    case "padding-top": style.paddingTop = lengthValue(value, property, candidate); return
    case "padding-right": style.paddingRight = lengthValue(value, property, candidate); return
    case "padding-bottom": style.paddingBottom = lengthValue(value, property, candidate); return
    case "padding-left": style.paddingLeft = lengthValue(value, property, candidate); return
    case "margin": applyBoxShorthand(style, "margin", value, candidate); return
    case "margin-inline": applyPair(style, "marginLeft", "marginRight", value, property, candidate); return
    case "margin-block": applyPair(style, "marginTop", "marginBottom", value, property, candidate); return
    case "margin-top": style.marginTop = lengthValue(value, property, candidate); return
    case "margin-right": style.marginRight = lengthValue(value, property, candidate); return
    case "margin-bottom": style.marginBottom = lengthValue(value, property, candidate); return
    case "margin-left": style.marginLeft = lengthValue(value, property, candidate); return
    case "position": style.position = value; return
    case "top": style.top = lengthValue(value, property, candidate); return
    case "right": style.right = lengthValue(value, property, candidate); return
    case "bottom": style.bottom = lengthValue(value, property, candidate); return
    case "left": style.left = lengthValue(value, property, candidate); return
    case "background-color": style.backgroundColor = normalizeColor(value); return
    case "color": style.color = normalizeColor(value); return
    case "opacity": style.opacity = numberValue(value, property, candidate); return
    case "border-width": style.borderWidth = lengthValue(value, property, candidate); return
    case "border-color": style.borderColor = normalizeColor(value); return
    case "border-radius": style.borderRadius = lengthValue(value, property, candidate); return
    case "font-size": style.fontSize = lengthValue(value, property, candidate); return
    case "font-weight": style.fontWeight = numericOrString(value); return
    case "line-height": style.lineHeight = lengthValue(value, property, candidate); return
    case "text-align": style.textAlign = value; return
    case "white-space": style.whiteSpace = value; return
    case "text-overflow": style.textOverflow = value; return
    case "overflow": style.overflow = value; return
    case "overflow-x": style.overflowX = value; return
    case "overflow-y": style.overflowY = value; return
    case "cursor": style.cursor = value; return
    case "pointer-events": style.pointerEvents = value; return
    case "user-select": style.userSelect = value; return
    case "border-style":
      if (value === "solid") return
      break
  }
  throw new Error(`Unsupported CSS declaration from Tailwind candidate ${JSON.stringify(candidate)}: ${property}: ${value}`)
}

function applyPair(style, first, second, value, property, candidate) {
  const parts = splitWhitespace(value)
  if (parts.length === 0 || parts.length > 2) throw new Error(`Unsupported ${property} value for ${JSON.stringify(candidate)}: ${value}`)
  style[first] = lengthValue(parts[0], property, candidate)
  style[second] = lengthValue(parts[1] ?? parts[0], property, candidate)
}

function applyBoxShorthand(style, prefix, value, candidate) {
  const parts = splitWhitespace(value)
  if (parts.length < 1 || parts.length > 4) throw new Error(`Unsupported ${prefix} shorthand for ${JSON.stringify(candidate)}: ${value}`)
  const top = lengthValue(parts[0], prefix, candidate)
  const right = lengthValue(parts[1] ?? parts[0], prefix, candidate)
  const bottom = lengthValue(parts[2] ?? parts[0], prefix, candidate)
  const left = lengthValue(parts[3] ?? parts[1] ?? parts[0], prefix, candidate)
  if (top === right && right === bottom && bottom === left) style[prefix] = top
  else {
    style[`${prefix}Top`] = top
    style[`${prefix}Right`] = right
    style[`${prefix}Bottom`] = bottom
    style[`${prefix}Left`] = left
  }
}

function dimensionValue(value, property, candidate) {
  if (value === "auto" || value.endsWith("%")) return value
  return lengthValue(value, property, candidate)
}

function lengthValue(value, property, candidate) {
  const normalized = value.trim()
  if (normalized === "0") return 0
  const px = normalized.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (px) return Number(px[1])
  const rem = normalized.match(/^(-?\d+(?:\.\d+)?)rem$/)
  if (rem) return Number(rem[1]) * 16
  const calc = normalized.match(/^calc\(\s*(-?\d+(?:\.\d+)?)(px|rem)\s*([*/])\s*(-?\d+(?:\.\d+)?)\s*\)$/)
  if (calc) {
    const left = Number(calc[1]) * (calc[2] === "rem" ? 16 : 1)
    const right = Number(calc[4])
    return calc[3] === "*" ? left * right : left / right
  }
  throw new Error(`Unsupported native length from Tailwind candidate ${JSON.stringify(candidate)}: ${property}: ${value}`)
}

function numberValue(value, property, candidate) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Expected numeric ${property} for ${JSON.stringify(candidate)}, received ${value}`)
  return number
}

function numericOrString(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : value
}

function normalizeColor(value) {
  const mix = value.match(/^color-mix\(in oklab,\s*(oklch\([^)]*\))\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/)
  if (!mix) return value
  const color = mix[1]
  const alpha = mix[2]
  if (color.includes("/")) return value
  return color.replace(/\)$/, ` / ${alpha}%)`)
}

function resolveCssValue(value, variables) {
  let result = value
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const variable = firstVarFunction(result)
    if (!variable) return result
    const replacement = variables[variable.name] ?? variable.fallback
    if (replacement === undefined) throw new Error(`Unresolved CSS variable ${variable.name} in ${JSON.stringify(value)}`)
    result = result.slice(0, variable.start) + replacement + result.slice(variable.end)
  }
  throw new Error(`CSS variable resolution exceeded 32 substitutions for ${JSON.stringify(value)}`)
}

function firstVarFunction(value) {
  const start = value.indexOf("var(")
  if (start < 0) return undefined
  let depth = 1
  let comma = -1
  let end = start + 4
  for (; end < value.length; end += 1) {
    const character = value[end]
    if (character === "(") depth += 1
    else if (character === ")") {
      depth -= 1
      if (depth === 0) break
    } else if (character === "," && depth === 1 && comma < 0) comma = end
  }
  if (depth !== 0) throw new Error(`Unclosed CSS var() in ${JSON.stringify(value)}`)
  const nameEnd = comma < 0 ? end : comma
  const name = value.slice(start + 4, nameEnd).trim()
  const fallback = comma < 0 ? undefined : value.slice(comma + 1, end).trim()
  return { start, end: end + 1, name, fallback }
}

function splitWhitespace(value) {
  return value.trim().split(/\s+/).filter(Boolean)
}

function escapeCssIdentifier(value) {
  let result = ""
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    const character = value[index]
    if (code === 0) {
      result += "�"
      continue
    }
    if ((code >= 1 && code <= 31) || code === 127 || (index === 0 && code >= 48 && code <= 57) || (index === 1 && code >= 48 && code <= 57 && value.charCodeAt(0) === 45)) {
      result += `\\${code.toString(16)} `
      continue
    }
    if (index === 0 && character === "-" && value.length === 1) {
      result += "\\-"
      continue
    }
    if (code >= 128 || character === "-" || character === "_" || (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      result += character
    } else {
      result += `\\${character}`
    }
  }
  return result
}
