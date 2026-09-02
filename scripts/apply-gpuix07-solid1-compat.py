from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"missing patch marker in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Staged-package validation follows the source manifest instead of duplicating a native-version literal.
path = "packages/solid1/scripts/validate-package.mjs"
replace(
    path,
    'const publicPackage = JSON.parse(readFileSync(path.join(packageRoot, ".publish/package.json"), "utf8"))\n',
    'const sourcePackage = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))\nconst publicPackage = JSON.parse(readFileSync(path.join(packageRoot, ".publish/package.json"), "utf8"))\n',
)
replace(
    path,
    'if (publicPackage.dependencies?.["@gpuix/native"] !== "^0.6.0") {\n  throw new Error(`Unexpected GPUIX native dependency: ${publicPackage.dependencies?.["@gpuix/native"]}`)\n}\n',
    'const expectedNativeRange = sourcePackage.dependencies?.["@gpuix/native"]\nif (!expectedNativeRange) throw new Error("Source Solid 1 package must declare @gpuix/native")\nif (publicPackage.dependencies?.["@gpuix/native"] !== expectedNativeRange) {\n  throw new Error(`Unexpected GPUIX native dependency: ${publicPackage.dependencies?.["@gpuix/native"]}; expected ${expectedNativeRange}`)\n}\n',
)

# Native style manifests preserve source focus classes separately from GPUIX StyleDesc.
path = "packages/solid1/src/native-style.ts"
replace(
    path,
    'export interface NativeStyleManifestEntry extends NativeStyleVariant {\n  descendants?: Record<string, NativeStyleVariant>\n  textTransform?: NativeTextTransform\n}\n',
    'export interface NativeStyleManifestEntry extends NativeStyleVariant {\n  /** Source :focus / :focus-visible styles applied by compatibility components that own focus state. */\n  focus?: NativeStyleVariant\n  descendants?: Record<string, NativeStyleVariant>\n  textTransform?: NativeTextTransform\n}\n',
)
replace(
    path,
    'export function resolveNativeClassTextTransform(\n',
    '''export function resolveNativeClassFocusStyle(\n  className: string | undefined,\n  classList: NativeClassList | undefined,\n): StyleDesc | undefined {\n  const candidates = classCandidates(className, classList)\n  if (candidates.length === 0) return undefined\n  const activeManifest = requireManifest()\n\n  let resolved: StyleDesc | undefined\n  for (const candidate of candidates) {\n    const entry = activeManifest.classes[candidate]\n    if (!entry) throw missingCandidate(candidate)\n    resolved = mergeNativeStyles(resolved, resolveVariant(entry.focus))\n  }\n  return resolved\n}\n\nexport function resolveNativeClassTextTransform(\n''',
)

# Kobalte owns semantic item focus, so apply the exact source focus classes on real native focus events.
path = "packages/solid1/src/kobalte/dropdown-menu.tsx"
replace(
    path,
    'import type { PolymorphicProps } from "./polymorphic.js"\n',
    'import { resolveNativeClassFocusStyle } from "../native-style.js"\nimport type { PolymorphicProps } from "./polymorphic.js"\n',
)
replace(
    path,
    '''function withHoveredStyle(base: StyleDesc, style: StyleDesc | undefined, hovered: boolean): StyleDesc {\n  const merged = mergeStyle(base, style)\n  return hovered && style?.hover ? mergeStyle(merged, style.hover) : merged\n}\n\n''',
    '''function focusClassStyle(props: Pick<NativeComponentProps, "class" | "className" | "classList">): StyleDesc | undefined {\n  const className = [props.class, props.className].filter(Boolean).join(" ")\n  return resolveNativeClassFocusStyle(className || undefined, props.classList)\n}\n\n''',
)
replace(
    path,
    '  const [hovered, setHovered] = createSignal(false)\n  const focusKey: FocusKey = Symbol("dropdown-item")\n',
    '  const [hovered, setHovered] = createSignal(false)\n  const [focused, setFocused] = createSignal(false)\n  const focusKey: FocusKey = Symbol("dropdown-item")\n',
)
replace(
    path,
    '''  const style = () => {\n    const base = classAwareFallback(props, fallback, disabledState(props.disabled))\n    return hovered() && props.style?.hover ? mergeStyle(base, props.style.hover) : base\n  }\n''',
    '''  const style = () => {\n    const base = classAwareFallback(props, fallback, disabledState(props.disabled))\n    const withFocus = focused() ? mergeStyle(base, focusClassStyle(props)) : base\n    return hovered() && props.style?.hover ? mergeStyle(withFocus, props.style.hover) : withFocus\n  }\n''',
)
replace(
    path,
    '      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); if (!props.disabled) setHovered(true) }}\n      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); setHovered(false) }}\n',
    '      onFocus={(event: EventPayload) => { props.onFocus?.(event); if (!props.disabled) setFocused(true) }}\n      onBlur={(event: EventPayload) => { props.onBlur?.(event); setFocused(false) }}\n      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); if (!props.disabled) setHovered(true) }}\n      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); setHovered(false) }}\n',
)
replace(
    path,
    '  const [hovered, setHovered] = createSignal(false)\n  const focusKey: FocusKey = Symbol("dropdown-sub-trigger")\n',
    '  const [hovered, setHovered] = createSignal(false)\n  const [focused, setFocused] = createSignal(false)\n  const focusKey: FocusKey = Symbol("dropdown-sub-trigger")\n',
)
replace(
    path,
    '''  const style = () => {\n    const base = classAwareFallback(props, fallback, disabledState(props.disabled))\n    return hovered() && props.style?.hover ? mergeStyle(base, props.style.hover) : base\n  }\n''',
    '''  const style = () => {\n    const base = classAwareFallback(props, fallback, disabledState(props.disabled))\n    const withFocus = focused() ? mergeStyle(base, focusClassStyle(props)) : base\n    return hovered() && props.style?.hover ? mergeStyle(withFocus, props.style.hover) : withFocus\n  }\n''',
)
replace(
    path,
    '      onMouseEnter={(event: EventPayload) => {\n        props.onMouseEnter?.(event)\n',
    '      onFocus={(event: EventPayload) => { props.onFocus?.(event); if (!props.disabled) setFocused(true) }}\n      onBlur={(event: EventPayload) => { props.onBlur?.(event); setFocused(false) }}\n      onMouseEnter={(event: EventPayload) => {\n        props.onMouseEnter?.(event)\n',
)

# Compile :focus / :focus-visible into semantic manifest state instead of dropping source styles.
path = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"
file = Path(path)
text = file.read_text()
text = text.replace("GPUIX 0.4.0 supports equal-count CSS grid tracks", "GPUIX 0.7 supports equal-count CSS grid tracks")
text = text.replace("@gpuix/native@0.4.0", "GPUIX 0.7")
text = text.replace(
    '["shadow-md", "boxShadow exists upstream but is not published in GPUIX 0.7"],\n  ["shadow-lg", "boxShadow exists upstream but is not published in GPUIX 0.7"],',
    '["shadow-md", "Tailwind shadow-md is layered; GPUIX 0.7 exposes one native BoxShadow"],\n  ["shadow-lg", "Tailwind shadow-lg is layered; GPUIX 0.7 exposes one native BoxShadow"],',
)
text = text.replace('  ["focus:bg-accent", "native Kobalte menu adapters own item hover/focus highlighting"],\n', '')
text = text.replace('  ["focus:text-accent-foreground", "native Kobalte menu adapters own item hover/focus foreground state"],\n', '')
file.write_text(text)

replace(
    path,
    '''  const light = compileRule(rule, candidate, variables.light)\n  const dark = compileRule(rule, candidate, variables.dark)\n  const variant = JSON.stringify(light) === JSON.stringify(dark)\n    ? { base: light }\n    : { light, dark }\n\n  classes[candidate] = descendant\n    ? { descendants: { [descendant]: variant } }\n    : variant\n''',
    '''  const lightCompiled = compileRule(rule, candidate, variables.light)\n  const darkCompiled = compileRule(rule, candidate, variables.dark)\n  const variant = JSON.stringify(lightCompiled.style) === JSON.stringify(darkCompiled.style)\n    ? { base: lightCompiled.style }\n    : { light: lightCompiled.style, dark: darkCompiled.style }\n  const hasFocus = Object.keys(lightCompiled.focus).length > 0 || Object.keys(darkCompiled.focus).length > 0\n  const focus = hasFocus\n    ? JSON.stringify(lightCompiled.focus) === JSON.stringify(darkCompiled.focus)\n      ? { base: lightCompiled.focus }\n      : { light: lightCompiled.focus, dark: darkCompiled.focus }\n    : undefined\n\n  if (descendant && focus) throw new Error(`Unsupported focused descendant native Tailwind candidate ${JSON.stringify(candidate)}`)\n  classes[candidate] = descendant\n    ? { descendants: { [descendant]: variant } }\n    : focus ? { ...variant, focus } : variant\n''',
)
replace(
    path,
    '''  const base = {}\n  const hover = {}\n  const active = {}\n\n  rule.walkDecls((declaration) => {\n    if (declaration.prop.startsWith("--")) return\n    const state = declarationState(declaration, rule, candidate)\n    const target = state === "hover" ? hover : state === "active" ? active : base\n''',
    '''  const base = {}\n  const hover = {}\n  const active = {}\n  const focus = {}\n\n  rule.walkDecls((declaration) => {\n    if (declaration.prop.startsWith("--")) return\n    const state = declarationState(declaration, rule, candidate)\n    const target = state === "hover" ? hover : state === "active" ? active : state === "focus" ? focus : base\n''',
)
replace(
    path,
    '''  if (Object.keys(active).length > 0) result.active = active\n  if (Object.keys(result).length === 0) throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)\n  return result\n}\n''',
    '''  if (Object.keys(active).length > 0) result.active = active\n  if (Object.keys(result).length === 0 && Object.keys(focus).length === 0) {\n    throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)\n  }\n  return { style: result, focus }\n}\n''',
)
replace(
    path,
    '''  if (/(^|[^\\\\]):active\\b/.test(selector)) states.add("active")\n\n  const unsupported = ["focus", "focus-visible", "disabled", "checked"]\n''',
    '''  if (/(^|[^\\\\]):active\\b/.test(selector)) states.add("active")\n  if (/(^|[^\\\\]):focus(?:-visible)?\\b/.test(selector)) states.add("focus")\n\n  const unsupported = ["disabled", "checked"]\n''',
)
