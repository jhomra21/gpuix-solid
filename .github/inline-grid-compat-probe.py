from pathlib import Path

path = Path("packages/solid1/src/universal.ts")
source = path.read_text()

import_anchor = 'import { createRenderer } from "solid-js/universal"\n'
import_text = '''import { createRenderer } from "solid-js/universal"
import {
  browserGridContainerStyle,
  browserGridItemStyle,
  parseBrowserGridTemplateColumns,
  type BrowserGridTrack,
} from "./browser-grid-compat.js"
'''
if import_anchor not in source:
    raise SystemExit("universal import anchor missing")
source = source.replace(import_anchor, import_text, 1)

input_anchor = '  "column-gap"?: DimensionValue\n'
input_replacement = '  "column-gap"?: DimensionValue\n  "grid-template-columns"?: string\n'
if input_anchor not in source:
    raise SystemExit("inline style type anchor missing")
source = source.replace(input_anchor, input_replacement, 1)

map_anchor = 'const styleStates = new WeakMap<HostElementNode, NativeStyleState>()\n'
map_replacement = '''const styleStates = new WeakMap<HostElementNode, NativeStyleState>()
const inlineGridColumns = new WeakMap<HostElementNode, readonly BrowserGridTrack[]>()
'''
if map_anchor not in source:
    raise SystemExit("style map anchor missing")
source = source.replace(map_anchor, map_replacement, 1)

style_anchor = '''        const inlineStyle = value as NativeInlineStyleInput | undefined
        setNativeInlineStyle(node, normalizeNativeInlineStyle(inlineStyle))
'''
style_replacement = '''        const inlineStyle = value as NativeInlineStyleInput | undefined
        setNativeInlineGridColumns(node, parseBrowserGridTemplateColumns(inlineStyle?.["grid-template-columns"]))
        setNativeInlineStyle(node, normalizeNativeInlineStyle(inlineStyle))
'''
if style_anchor not in source:
    raise SystemExit("style property anchor missing")
source = source.replace(style_anchor, style_replacement, 1)

normalize_anchor = '''    "row-gap": cssRowGap,
    "column-gap": cssColumnGap,
    "min-width": cssMinWidth,
'''
normalize_replacement = '''    "row-gap": cssRowGap,
    "column-gap": cssColumnGap,
    "grid-template-columns": cssGridTemplateColumns,
    "min-width": cssMinWidth,
'''
if normalize_anchor not in source:
    raise SystemExit("normalize destructure anchor missing")
source = source.replace(normalize_anchor, normalize_replacement, 1)

normalized_anchor = '  const normalized: StyleDesc = { ...nativeStyle }\n\n'
normalized_replacement = '''  const normalized: StyleDesc = { ...nativeStyle }
  const gridContainerStyle = browserGridContainerStyle(parseBrowserGridTemplateColumns(cssGridTemplateColumns))
  if (gridContainerStyle) Object.assign(normalized, gridContainerStyle)

'''
if normalized_anchor not in source:
    raise SystemExit("normalized style anchor missing")
source = source.replace(normalized_anchor, normalized_replacement, 1)

set_style_anchor = '''function setNativeInlineStyle(node: HostElementNode, style: StyleDesc | undefined): void {
  const state = nativeStyleState(node)
  state.inlineStyle = style
  commitNativeStyleState(node, state)
}
'''
set_style_replacement = '''function setNativeInlineGridColumns(node: HostElementNode, tracks: readonly BrowserGridTrack[] | undefined): void {
  if (tracks) inlineGridColumns.set(node, tracks)
  else inlineGridColumns.delete(node)
}

function setNativeInlineStyle(node: HostElementNode, style: StyleDesc | undefined): void {
  const state = nativeStyleState(node)
  state.inlineStyle = style
  commitNativeStyleState(node, state)
}
'''
if set_style_anchor not in source:
    raise SystemExit("set inline style anchor missing")
source = source.replace(set_style_anchor, set_style_replacement, 1)

ancestor_anchor = '''  let resolved: StyleDesc | undefined
  for (const ancestor of ancestors) {
'''
ancestor_replacement = '''  let resolved: StyleDesc | undefined = resolveInlineGridItemStyle(node)
  for (const ancestor of ancestors) {
'''
if ancestor_anchor not in source:
    raise SystemExit("ancestor style anchor missing")
source = source.replace(ancestor_anchor, ancestor_replacement, 1)

combined_anchor = '''function combinedClassName(state: NativeStyleState): string | undefined {
'''
inline_helpers = '''function resolveInlineGridItemStyle(node: HostElementNode): StyleDesc | undefined {
  let ancestor: HostParent | null = node.parent
  while (ancestor && ancestor.kind === "element") {
    const tracks = inlineGridColumns.get(ancestor)
    if (tracks) return browserGridItemStyle(tracks, inlineGridItemIndex(ancestor, node))
    if (sourceDisplay(ancestor) !== "contents") return undefined
    ancestor = ancestor.parent
  }
  return undefined
}

function inlineGridItemIndex(grid: HostElementNode, target: HostElementNode): number | undefined {
  let index = 0
  let found: number | undefined
  const visit = (node: HostElementNode) => {
    const display = sourceDisplay(node)
    if (display === "none") return
    if (display === "contents") {
      for (const child of node.children) {
        if (child.kind === "element") visit(child)
      }
      return
    }
    index++
    if (node === target) found = index
  }
  for (const child of grid.children) {
    if (child.kind === "element") visit(child)
    if (found !== undefined) break
  }
  return found
}

function sourceDisplay(node: HostElementNode): StyleDesc["display"] | undefined {
  const state = styleStates.get(node)
  if (!state) return node.style?.display
  if (state.hidden) return "none"
  if (state.inlineStyle?.display !== undefined) return state.inlineStyle.display
  return resolveNativeClassStyle(combinedClassName(state), state.classList, state.inlineStyle?.fontSize)?.display
}

'''
if combined_anchor not in source:
    raise SystemExit("combined class anchor missing")
source = source.replace(combined_anchor, inline_helpers + combined_anchor, 1)

path.write_text(source)
