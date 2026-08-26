import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "@tailwindcss/node"
import postcss from "postcss"
import * as ts from "typescript"

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

// GPUIX 0.4.0 supports equal-count CSS grid tracks, but not arbitrary CSS
// templates or justify-self. Preserve the copied transport's 1fr/auto/1fr
// semantics with the equivalent flex layout: equal flexible side zones around
// one intrinsic center zone. Other entries below translate source geometry
// into native fields without editing the copied DAW components.
const nativeCompatEntries = new Map([
  ["grid-cols-[1fr_auto_1fr]", { base: { display: "flex", flexDirection: "row" } }],
  ["justify-self-start", { base: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, justifyContent: "flex-start" } }],
  ["justify-self-center", { base: { flexGrow: 0, flexShrink: 0 } }],
  ["justify-self-end", { base: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, justifyContent: "flex-end" } }],
  ["grid-cols-1", { base: { gridTemplateColumns: 1 } }],
  ["space-y-0.5", { base: { gap: 2 } }],
  ["rounded-full", { base: { borderRadius: 9999 } }],
  // Browser resize handle: parent is 8px wide and the rail is 4px wide, so
  // CSS right:50% + translateX(50%) is exactly a 2px right inset natively.
  ["right-1/2", { base: { right: 2 } }],
  ["translate-x-1/2", { base: {} }],
  // Bottom-panel resize handle is 16px tall and its center rail is 4px tall.
  // CSS top:50% + translateY(-50%) therefore lands at top:6px exactly.
  ["top-1/2", { base: { top: 6 } }],
  ["-translate-y-1/2", { base: {} }],
])

const explicitlyIgnored = new Map([
  ["active:scale-97", "@gpuix/native@0.4.0 has no transform/scale StyleDesc field"],
  ["group", "Tailwind group is a relationship-state marker and has no direct painted native style"],
  ["group-hover:bg-sky-500/20", "group relationship hover styling is not exposed by @gpuix/native@0.4.0"],
  ["group-active:bg-sky-500/20", "group relationship active styling is not exposed by @gpuix/native@0.4.0"],
  ["group-hover:text-foreground", "the copied browser item already has text-foreground as its base color; native group relationship hover styling is not exposed"],
  ["!transition-transform", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["!duration-150", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["transition-colors", "native StyleDesc transitions are not published in @gpuix/native@0.4.0"],
  ["ring-offset-background", "native focus ring offset styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:outline-none", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-2", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-ring", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus-visible:ring-offset-2", "native focus-visible styling is not exposed by @gpuix/native@0.4.0"],
  ["focus:border-border", "native focus pseudo styling is not published; this input already has the same border-border base color"],
  ["focus:outline-none", "native inputs do not paint a browser focus outline"],
  ["focus:bg-app-surface/60", "native input focus background pseudo styling is not published by @gpuix/native@0.4.0"],
  ["focus:bg-accent", "native Kobalte menu adapters own item hover/focus highlighting"],
  ["focus:text-accent-foreground", "native Kobalte menu adapters own item hover/focus foreground state"],
  ["outline-none", "GPUIX native inputs and menu primitives do not paint the browser outline suppressed by this utility"],
  ["disabled:pointer-events-none", "the native Kobalte adapter owns disabled pointer behavior"],
  ["disabled:opacity-50", "the native Kobalte adapter owns disabled opacity"],
  ["disabled:opacity-60", "the native input/browser adapter owns disabled opacity"],
  ["underline-offset-4", "native text decoration offset is not exposed by @gpuix/native@0.4.0"],
  ["hover:underline", "native text decoration is not exposed by @gpuix/native@0.4.0"],
  ["file:border-0", "native input has no browser file-selector pseudo-element"],
  ["file:bg-transparent", "native input has no browser file-selector pseudo-element"],
  ["file:text-sm", "native input has no browser file-selector pseudo-element"],
  ["file:font-medium", "native input has no browser file-selector pseudo-element"],
  ["placeholder:text-muted-foreground", "native input placeholder styling is not separately exposed by @gpuix/native@0.4.0"],
  ["selection:bg-primary/40", "native text selection has its own selectionColor contract rather than CSS ::selection variants"],
  ["disabled:cursor-not-allowed", "the native Kobalte adapter owns disabled interaction"],
  ["data-[disabled]:pointer-events-none", "native Kobalte menu adapters own disabled item hit testing"],
  ["data-[disabled]:opacity-50", "native Kobalte menu adapters own disabled item opacity"],
  ["data-[invalid]:border-error-foreground", "the native TextField adapter owns invalid border state until data-state variants are native"],
  ["data-[invalid]:text-error-foreground", "the native TextField adapter owns invalid state until data-state variants are native"],
  ["data-[invalid]:text-destructive", "the native TextField adapter owns invalid label/error presentation"],
  ["data-[expanded]:bg-muted", "the native Menubar adapter owns expanded trigger background state"],
  ["data-[expanded]:text-foreground", "the native Menubar adapter owns expanded trigger state; arbitrary data variants are not native selectors"],
  ["data-[expanded]:bg-accent", "the native Menubar adapter owns expanded trigger background state"],
  ["data-[expanded]:text-accent-foreground", "the native Menubar adapter owns expanded trigger foreground state"],
  ["data-[state=open]:bg-accent", "the native DropdownMenu sub adapter owns open-state highlighting"],
  ["peer-disabled:cursor-not-allowed", "peer variants require native relationship-state styling"],
  ["peer-disabled:opacity-70", "peer variants require native relationship-state styling"],
  ["leading-none", "relative line-height needs merged font-size context before it can be represented exactly"],
  ["appearance-none", "GPUIX native inputs do not have browser user-agent appearance chrome to suppress"],
  ["fill-current", "inline GPUIX SVG styling does not expose CSS fill through StyleDesc; source currentColor stroke still inherits normally"],
  ["tabular-nums", "font-variant-numeric is not exposed by @gpuix/native@0.4.0"],
  ["tracking-normal", "letter-spacing is not exposed by @gpuix/native@0.4.0"],
  ["tracking-wide", "letter-spacing is not exposed by @gpuix/native@0.4.0; keep the copied source unchanged until the native text contract supports it"],
  ["tracking-widest", "letter-spacing is not exposed by @gpuix/native@0.4.0"],
  ["border-dashed", "@gpuix/native@0.4.0 exposes border width/color but not border style; native fallback remains solid"],
  ["max-h-(--kb-menu-content-available-height)", "native Kobalte FloatingLayer owns available-space popup placement/sizing; the browser CSS custom property does not exist natively"],
  ["origin-[var(--kb-menu-content-transform-origin)]", "native Kobalte FloatingLayer owns popup placement; CSS transform-origin is not exposed by @gpuix/native@0.4.0"],
  ["data-[expanded]:animate-in", "native Kobalte menus mount directly without browser CSS enter animations"],
  ["data-[closed]:animate-out", "native Kobalte menus unmount directly without browser CSS exit animations"],
  ["data-[closed]:fade-out-0", "native Kobalte menus unmount directly without browser CSS opacity animation"],
  ["data-[expanded]:fade-in-0", "native Kobalte menus mount directly without browser CSS opacity animation"],
  ["data-[closed]:zoom-out-95", "native Kobalte menus do not use browser CSS scale animations"],
  ["data-[expanded]:zoom-in-95", "native Kobalte menus do not use browser CSS scale animations"],
  ["data-[placement=bottom]:slide-in-from-top-2", "native FloatingLayer owns placement without CSS translate animation"],
  ["data-[placement=left]:slide-in-from-right-2", "native FloatingLayer owns placement without CSS translate animation"],
  ["data-[placement=right]:slide-in-from-left-2", "native FloatingLayer owns placement without CSS translate animation"],
  ["data-[placement=top]:slide-in-from-bottom-2", "native FloatingLayer owns placement without CSS translate animation"],
  ["data-[closed]:hidden", "native Kobalte menus own closed-state mounting rather than CSS visibility"],
  ["aspect-square", "the copied avatar already supplies equal native width and height through size utilities"],
  ["z-10", "published native StyleDesc has no z-index; retained-tree/layer order owns stacking"],
  ["z-30", "published native StyleDesc has no z-index; retained-tree/layer order owns stacking"],
  ["z-40", "published native StyleDesc has no z-index; retained-tree/layer order owns stacking"],
  ["z-50", "native anchored-layer priority owns popup stacking"],
  ["w-fit", "native floating content uses intrinsic sizing instead of CSS fit-content"],
  ["w-max", "native floating content uses intrinsic sizing; @gpuix/native@0.4.0 dimensions do not accept CSS max-content"],
  ["shadow-md", "boxShadow exists upstream but is not published in @gpuix/native@0.4.0"],
  ["shadow-lg", "boxShadow exists upstream but is not published in @gpuix/native@0.4.0"],
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
  const compatEntry = nativeCompatEntries.get(candidate)
  if (compatEntry) {
    classes[candidate] = compatEntry
    continue
  }

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

  for (const { sourcePath, text } of sources) {
    const scriptKind = sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sourceFile = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.Latest, true, scriptKind)

    const visit = (node) => {
      if (ts.isJsxAttribute(node) && (node.name.text === "class" || node.name.text === "className")) {
        collectClassExpression(node.initializer, candidates)
        return
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  return [...candidates].sort()
}

function collectClassExpression(node, candidates) {
  if (!node) return

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addClassString(node.text, candidates)
    return
  }

  if (ts.isTemplateExpression(node)) {
    addClassString(node.head.text, candidates)
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, candidates)
      addClassString(span.literal.text, candidates)
    }
    return
  }

  ts.forEachChild(node, (child) => collectClassExpression(child, candidates))
}

function addClassString(value, candidates) {
  for (const token of value.split(/\s+/)) {
    const candidate = token.trim()
    if (candidate) candidates.add(candidate)
  }
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
    case "flex": applyFlexShorthand(style, value, candidate); return
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
    case "inset": applyInsetShorthand(style, value, candidate); return
    case "inset-inline": applyPair(style, "left", "right", value, property, candidate); return
    case "inset-block": applyPair(style, "top", "bottom", value, property, candidate); return
    case "overflow": style.overflow = value; return
    case "overflow-x": style.overflowX = value; return
    case "overflow-y": style.overflowY = value; return
    case "background-color": style.backgroundColor = colorValue(value, property, candidate); return
    case "color": style.color = colorValue(value, property, candidate); return
    case "opacity": style.opacity = opacityValue(value, candidate); return
    case "border-width": style.borderWidth = lengthValue(value, property, candidate); return
    case "border-top-width": style.borderTopWidth = lengthValue(value, property, candidate); return
    case "border-right-width": style.borderRightWidth = lengthValue(value, property, candidate); return
    case "border-bottom-width": style.borderBottomWidth = lengthValue(value, property, candidate); return
    case "border-left-width": style.borderLeftWidth = lengthValue(value, property, candidate); return
    case "border-inline-width": {
      const width = lengthValue(value, property, candidate)
      style.borderLeftWidth = width
      style.borderRightWidth = width
      return
    }
    case "border-block-width": {
      const width = lengthValue(value, property, candidate)
      style.borderTopWidth = width
      style.borderBottomWidth = width
      return
    }
    case "border-style":
    case "border-top-style":
    case "border-right-style":
    case "border-bottom-style":
    case "border-left-style":
      if (value === "solid") return
      throw new Error(`Unsupported ${property} from ${JSON.stringify(candidate)}: ${value}`)
    case "border-inline-style":
    case "border-block-style":
      if (value === "solid") return
      throw new Error(`Unsupported ${property} from ${JSON.stringify(candidate)}: ${value}`)
    case "border-color": style.borderColor = colorValue(value, property, candidate); return
    case "border-top-color": style.borderTopColor = colorValue(value, property, candidate); return
    case "border-right-color": style.borderRightColor = colorValue(value, property, candidate); return
    case "border-bottom-color": style.borderBottomColor = colorValue(value, property, candidate); return
    case "border-left-color": style.borderLeftColor = colorValue(value, property, candidate); return
    case "border-radius": style.borderRadius = lengthValue(value, property, candidate); return
    case "border-top-left-radius": style.borderTopLeftRadius = lengthValue(value, property, candidate); return
    case "border-top-right-radius": style.borderTopRightRadius = lengthValue(value, property, candidate); return
    case "border-bottom-right-radius": style.borderBottomRightRadius = lengthValue(value, property, candidate); return
    case "border-bottom-left-radius": style.borderBottomLeftRadius = lengthValue(value, property, candidate); return
    case "font-family": style.fontFamily = value; return
    case "font-size": style.fontSize = lengthValue(value, property, candidate); return
    case "font-weight": style.fontWeight = numberOrStringValue(value); return
    case "line-height": style.lineHeight = lengthValue(value, property, candidate); return
    case "text-align": style.textAlign = value; return
    case "white-space": style.whiteSpace = value; return
    case "text-overflow": style.textOverflow = value; return
    case "cursor": style.cursor = value; return
    case "pointer-events": style.pointerEvents = value; return
    case "-webkit-user-select":
    case "user-select": style.userSelect = value; return
    case "box-sizing": return
    case "outline-style": return
    case "outline-width": return
    case "outline-color": return
    case "outline-offset": return
    case "--tw-ring-offset-width": return
    case "--tw-ring-offset-color": return
    case "--tw-ring-color": return
    case "--tw-ring-shadow": return
    case "--tw-inset-ring-shadow": return
    case "--tw-shadow": return
    case "--tw-shadow-colored": return
    case "box-shadow": return
    case "transition-property": return
    case "transition-duration": return
    case "transition-timing-function": return
    default:
      throw new Error(`Unsupported CSS declaration from Tailwind candidate ${JSON.stringify(candidate)}:\n${property}: ${value}`)
  }
}

function applyFlexShorthand(style, value, candidate) {
  if (value === "none") {
    style.flexGrow = 0
    style.flexShrink = 0
    style.flexBasis = "auto"
    return
  }
  if (value === "auto") {
    style.flexGrow = 1
    style.flexShrink = 1
    style.flexBasis = "auto"
    return
  }
  if (value === "initial") {
    style.flexGrow = 0
    style.flexShrink = 1
    style.flexBasis = "auto"
    return
  }

  const parts = splitCssValue(value)
  if (parts.length === 1) {
    style.flexGrow = numberValue(parts[0], "flex-grow", candidate)
    style.flexShrink = 1
    style.flexBasis = 0
    return
  }
  if (parts.length === 2) {
    style.flexGrow = numberValue(parts[0], "flex-grow", candidate)
    const secondNumber = Number(parts[1])
    if (Number.isFinite(secondNumber)) {
      style.flexShrink = secondNumber
      style.flexBasis = 0
    } else {
      style.flexShrink = 1
      style.flexBasis = lengthValue(parts[1], "flex-basis", candidate)
    }
    return
  }
  if (parts.length === 3) {
    style.flexGrow = numberValue(parts[0], "flex-grow", candidate)
    style.flexShrink = numberValue(parts[1], "flex-shrink", candidate)
    style.flexBasis = lengthValue(parts[2], "flex-basis", candidate)
    return
  }
  throw new Error(`Unsupported flex shorthand from ${JSON.stringify(candidate)}: ${value}`)
}

function applyBoxShorthand(style, prefix, value, candidate) {
  const parts = splitCssValue(value)
  if (parts.length < 1 || parts.length > 4) throw new Error(`Unsupported ${prefix} shorthand for ${JSON.stringify(candidate)}: ${value}`)
  const [a, b = a, c = a, d = b] = parts
  style[`${prefix}Top`] = lengthValue(a, prefix, candidate)
  style[`${prefix}Right`] = lengthValue(b, prefix, candidate)
  style[`${prefix}Bottom`] = lengthValue(c, prefix, candidate)
  style[`${prefix}Left`] = lengthValue(d, prefix, candidate)
}

function applyPair(style, first, second, value, property, candidate) {
  const parts = splitCssValue(value)
  if (parts.length === 0 || parts.length > 2) throw new Error(`Unsupported ${property} shorthand for ${JSON.stringify(candidate)}: ${value}`)
  style[first] = lengthValue(parts[0], property, candidate)
  style[second] = lengthValue(parts[1] ?? parts[0], property, candidate)
}

function applyInsetShorthand(style, value, candidate) {
  const parts = splitCssValue(value)
  if (parts.length < 1 || parts.length > 4) throw new Error(`Unsupported inset shorthand for ${JSON.stringify(candidate)}: ${value}`)
  const [top, right = top, bottom = top, left = right] = parts
  style.top = lengthValue(top, "inset", candidate)
  style.right = lengthValue(right, "inset", candidate)
  style.bottom = lengthValue(bottom, "inset", candidate)
  style.left = lengthValue(left, "inset", candidate)
}

function resolveCssValue(value, variables) {
  let current = value
  for (let iteration = 0; iteration < 12 && current.includes("var("); iteration++) {
    const next = current.replace(/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g, (_match, name, fallback) => variables[name] ?? fallback ?? `var(${name})`)
    if (next === current) break
    current = next
  }
  return current
}

function lengthValue(value, property, candidate) {
  if (value === "0" || value === "0%") return 0
  if (value === "auto") return "auto"
  if (value === "100%") return "100%"
  const px = value.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (px) return Number(px[1])
  const rem = value.match(/^(-?\d+(?:\.\d+)?)rem$/)
  if (rem) return Number(rem[1]) * 16
  const product = value.match(/^calc\(\s*(-?\d+(?:\.\d+)?)(px|rem)\s*\*\s*(-?\d+(?:\.\d+)?)\s*\)$/)
  if (product) {
    const amount = Number(product[1]) * Number(product[3])
    return product[2] === "rem" ? amount * 16 : amount
  }
  throw new Error(`Unsupported ${property} length from ${JSON.stringify(candidate)}: ${value}`)
}

function dimensionValue(value, property, candidate) {
  return lengthValue(value, property, candidate)
}

function colorValue(value, property, candidate) {
  const keyword = value.toLowerCase()
  if (keyword === "transparent") return "transparent"
  if (keyword === "currentcolor") return "currentColor"
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value
  if (/^oklch\(/i.test(value)) return value
  if (/^color-mix\(/i.test(value)) return value
  if (/^rgb\(/i.test(value)) return value
  throw new Error(`Unsupported ${property} color from ${JSON.stringify(candidate)}: ${value}`)
}

function opacityValue(value, candidate) {
  if (value.endsWith("%")) {
    const percentage = Number(value.slice(0, -1))
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Unsupported opacity percentage from ${JSON.stringify(candidate)}: ${value}`)
    }
    return percentage / 100
  }
  const opacity = numberValue(value, "opacity", candidate)
  if (opacity < 0 || opacity > 1) throw new Error(`Unsupported opacity number from ${JSON.stringify(candidate)}: ${value}`)
  return opacity
}

function numberValue(value, property, candidate) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Unsupported ${property} number from ${JSON.stringify(candidate)}: ${value}`)
  return number
}

function numberOrStringValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

function splitCssValue(value) {
  const parts = []
  let current = ""
  let depth = 0

  for (const character of value.trim()) {
    if (character === "(") depth += 1
    else if (character === ")") depth -= 1

    if (/\s/.test(character) && depth === 0) {
      if (current) {
        parts.push(current)
        current = ""
      }
      continue
    }
    current += character
  }

  if (current) parts.push(current)
  if (depth !== 0) throw new Error(`Unbalanced CSS value: ${value}`)
  return parts
}

function escapeCssIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character.charCodeAt(0).toString(16)} `)
}
