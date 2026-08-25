import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "@tailwindcss/node"
import postcss from "postcss"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const themePath = path.join(projectRoot, "src/native-theme.css")
const sourcesPath = path.join(projectRoot, "native-tailwind.sources.json")
const outputPath = path.join(projectRoot, "src/native-tailwind.generated.ts")

const nativeTextTransforms = new Map([
  ["uppercase", "uppercase"],
  ["lowercase", "lowercase"],
  ["capitalize", "capitalize"],
  ["normal-case", "none"],
])

const explicitlyIgnored = new Map([
  ["active:scale-97", "@gpuix/native@0.4.0 has no transform/scale StyleDesc field"],
  ["!transition-transform", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["!duration-150", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["transition-colors", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["ring-offset-background", "native focus ring offset styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:outline-none", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-2", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-ring", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-offset-2", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["disabled:pointer-events-none", "the native Kobalte adapter owns disabled pointer behavior"],
  ["disabled:opacity-50", "the native Kobalte adapter owns disabled opacity"],
  ["underline-offset-4", "native text decoration offset is not exposed by @gpuix/native@0.4.0"],
  ["hover:underline", "native text decoration is not exposed by @gpuix/native@0.4.0"],
  ["file:border-0", "native input has no browser file-selector pseudo-element"],
  ["file:bg-transparent", "native input has no browser file-selector pseudo-element"],
  ["file:text-sm", "native input has no browser file-selector pseudo-element"],
  ["file:font-medium", "native input has no browser file-selector pseudo-element"],
  ["placeholder:text-muted-foreground", "native input placeholder styling is not separately exposed by @gpuix/native@0.4.0"],
  ["disabled:cursor-not-allowed", "the native Kobalte adapter owns disabled interaction"],
  ["data-[invalid]:border-error-foreground", "the native TextField adapter owns invalid border state until data-state variants are native"],
  ["data-[invalid]:text-error-foreground", "the native TextField adapter owns invalid state until data-state variants are native"],
  ["peer-disabled:cursor-not-allowed", "peer variants require native relationship-state styling"],
  ["peer-disabled:opacity-70", "peer variants require native relationship-state styling"],
  ["leading-none", "relative line-height needs merged font-size context before it can be represented exactly"],
  ["aspect-square", "the copied avatar already supplies equal native width and height through size utilities"],
  ["z-50", "native anchored-layer priority owns popup stacking"],
  ["w-fit", "native floating content uses intrinsic sizing instead of CSS fit-content"],
  ["shadow-md", "boxShadow exists upstream but is not published in @gpuix/native@0.4.0"],
  ["tracking-wide", "letter-spacing is not exposed by @gpuix/native@0.4.0; keep the copied source unchanged until the native text contract supports it"],
])

const themeCss = await readFile(themePath, "utf8")
const sourcePaths = JSON.parse(await readFile(sourcesPath, "utf8"))
const sourceTexts = await Promise.all(
  sourcePaths.map(async (sourcePath) => ({
    sourcePath,
    text: await readFile(path.join(projectRoot, sourcePath), "utf8"),
  })),
)
const rawCandidates = collectCandidates(sourceTexts)

const compiler = await compile(themeCss, {
  base: projectRoot,
  from: themePath,
  onDependency() {},
})
const compiledCss = compiler.build(rawCandidates)
const root = postcss.parse(compiledCss, { from: themePath })
const variables = collectThemeVariables(root)
const classes = {}
const omissions = []

for (const candidate of rawCandidates) {
  const textTransform = nativeTextTransforms.get(candidate)
  if (textTransform) {
    classes[candidate] = { base: {}, textTransform }
    continue
  }

  const ignoredReason = explicitlyIgnored.get(candidate)
  if (ignoredReason) {
    classes[candidate] = { base: {} }
    omissions.push({ candidate, reason: ignoredReason })
    continue
  }

  const rule = findCandidateRule(root, candidate)
  if (!rule) continue

  const descendant = descendantTarget(candidate)
  const light = compileRule(rule, candidate, variables.light)
  const dark = compileRule(rule, candidate, variables.dark)
  const variant = JSON.stringify(light) === JSON.stringify(dark)
    ? { base: light }
    : { light, dark }

  classes[candidate] = descendant
    ? { descendants: { [descendant]: variant } }
    : variant
}

const omissionsComment = omissions.length === 0
  ? "// No explicit native omissions in this manifest.\n"
  : [
      "// Explicit native omissions. Each class remains registered so copied source can execute",
      "// without silently widening the unsupported-CSS surface. Remove an omission as soon as",
      "// the corresponding GPUIX/native contract can represent it faithfully.",
      ...omissions.map(({ candidate, reason }) => `// - ${candidate}: ${reason}`),
      "",
    ].join("\n")

const generated = `import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"\n\n` +
  omissionsComment +
  `export const nativeTailwindManifest: NativeStyleManifest = ${JSON.stringify({ classes }, null, 2)}\n`

await writeFile(outputPath, generated)
console.log(`DAW native Tailwind manifest: ${Object.keys(classes).length} classes from ${sourcePaths.length} copied source files (${omissions.length} explicit omissions)`)

function collectCandidates(sources) {
  const candidates = new Set()
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g

  for (const { text } of sources) {
    for (const match of text.matchAll(stringPattern)) {
      for (const token of match[2].split(/\s+/)) {
        const candidate = token.trim()
        if (candidate) candidates.add(candidate)
      }
    }
  }

  return [...candidates].sort()
}

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

  rootNode.walkAtRules("property", (rule) => {
    const initial = rule.nodes?.find((node) => node.type === "decl" && node.prop === "initial-value")
    if (initial?.type === "decl" && light[rule.params] === undefined) light[rule.params] = initial.value
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

function descendantTarget(candidate) {
  const descendant = candidate.match(/^\[&_([A-Za-z][\w-]*)\]:/)
  if (descendant) return descendant[1]
  const directChild = candidate.match(/^\[&>([A-Za-z][\w-]*)\]:/)
  if (directChild) return `>${directChild[1]}`
  return undefined
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
    case "opacity": style.opacity = opacityValue(value, candidate); return
    case "border-width": style.borderWidth = lengthValue(value, property, candidate); return
    case "border-inline-width": applyPair(style, "borderLeftWidth", "borderRightWidth", value, property, candidate); return
    case "border-block-width": applyPair(style, "borderTopWidth", "borderBottomWidth", value, property, candidate); return
    case "border-top-width": style.borderTopWidth = lengthValue(value, property, candidate); return
    case "border-right-width": style.borderRightWidth = lengthValue(value, property, candidate); return
    case "border-bottom-width": style.borderBottomWidth = lengthValue(value, property, candidate); return
    case "border-left-width": style.borderLeftWidth = lengthValue(value, property, candidate); return
    case "border-color": style.borderColor = normalizeColor(value); return
    case "border-radius": style.borderRadius = radiusValue(value, property, candidate); return
    case "font-size": style.fontSize = lengthValue(value, property, candidate); return
    case "font-weight": style.fontWeight = numericOrString(value); return
    case "line-height": style.lineHeight = lineHeightValue(value, candidate, style.fontSize); return
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
    case "border-inline-style":
    case "border-block-style":
    case "border-top-style":
    case "border-right-style":
    case "border-bottom-style":
    case "border-left-style":
      if (value === "solid") return
      break
  }
  throw new Error(`Unsupported CSS declaration from Tailwind candidate ${JSON.stringify(candidate)}: ${property}: ${value}`)
}

function applyPair(style, first, second, value, property, candidate) {
  const parts = splitTopLevelWhitespace(value)
  if (parts.length === 0 || parts.length > 2) throw new Error(`Unsupported ${property} value for ${JSON.stringify(candidate)}: ${value}`)
  style[first] = lengthValue(parts[0], property, candidate)
  style[second] = lengthValue(parts[1] ?? parts[0], property, candidate)
}

function applyBoxShorthand(style, prefix, value, candidate) {
  const parts = splitTopLevelWhitespace(value)
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

function radiusValue(value, property, candidate) {
  if (/^calc\(\s*infinity\s*\*\s*1px\s*\)$/.test(value)) return 9999
  return lengthValue(value, property, candidate)
}

function lengthValue(value, property, candidate) {
  const normalized = value.trim()
  if (normalized === "0") return 0
  const numberPattern = "-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?"
  const px = normalized.match(new RegExp(`^(${numberPattern})px$`, "i"))
  if (px) return Number(px[1])
  const rem = normalized.match(new RegExp(`^(${numberPattern})rem$`, "i"))
  if (rem) return Number(rem[1]) * 16
  const calc = normalized.match(new RegExp(`^calc\\(\\s*(${numberPattern})(px|rem)\\s*([*/])\\s*(${numberPattern})\\s*\\)$`, "i"))
  if (calc) {
    const left = Number(calc[1]) * (calc[2] === "rem" ? 16 : 1)
    const right = Number(calc[4])
    return calc[3] === "*" ? left * right : left / right
  }
  throw new Error(`Unsupported native length from Tailwind candidate ${JSON.stringify(candidate)}: ${property}: ${value}`)
}

function lineHeightValue(value, candidate, fontSize) {
  const normalized = value.trim()
  const direct = Number(normalized)
  if (Number.isFinite(direct)) return relativeLineHeight(direct, fontSize, candidate, value)
  const calc = normalized.match(/^calc\(\s*(-?\d+(?:\.\d+)?)\s*([*/])\s*(-?\d+(?:\.\d+)?)\s*\)$/)
  if (calc) {
    const left = Number(calc[1])
    const right = Number(calc[3])
    const ratio = calc[2] === "*" ? left * right : left / right
    return relativeLineHeight(ratio, fontSize, candidate, value)
  }
  return lengthValue(normalized, "line-height", candidate)
}

function relativeLineHeight(ratio, fontSize, candidate, sourceValue) {
  if (!Number.isFinite(fontSize)) {
    throw new Error(`Native Tailwind candidate ${JSON.stringify(candidate)} has relative line-height ${sourceValue} without a local font-size`)
  }
  return ratio * fontSize
}

function opacityValue(value, candidate) {
  const normalized = value.trim()
  if (normalized.endsWith("%")) {
    const percentage = Number(normalized.slice(0, -1))
    if (Number.isFinite(percentage)) return percentage / 100
  }
  return numberValue(normalized, "opacity", candidate)
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
  const mix = value.match(/^color-mix\(in (?:oklab|srgb),\s*(oklch\([^)]*\))\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/)
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

function splitTopLevelWhitespace(value) {
  const parts = []
  let start = 0
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === "(") depth += 1
    else if (character === ")") depth -= 1
    else if (/\s/.test(character) && depth === 0) {
      if (index > start) parts.push(value.slice(start, index))
      while (index + 1 < value.length && /\s/.test(value[index + 1])) index += 1
      start = index + 1
    }
  }
  if (start < value.length) parts.push(value.slice(start))
  return parts.filter(Boolean)
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