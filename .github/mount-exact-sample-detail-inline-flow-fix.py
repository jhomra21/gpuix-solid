from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
universal_path = ROOT / "packages/solid1/src/universal.ts"
universal = universal_path.read_text()

semantic_anchor = '''const TEXT_SEMANTIC_TAGS = new Set([
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "small",
  "label",
  "time",
  "kbd",
  "samp",
  "output",
  "option",
])
'''
semantic_replacement = semantic_anchor + '''
const INLINE_TEXT_SEMANTIC_TAGS = new Set([
  "span",
  "strong",
  "em",
  "small",
  "label",
  "time",
  "kbd",
  "samp",
  "output",
])
'''
if "const INLINE_TEXT_SEMANTIC_TAGS" not in universal:
    if semantic_anchor not in universal:
        raise SystemExit("inline text semantic anchor missing")
    universal = universal.replace(semantic_anchor, semantic_replacement, 1)

state_anchor = '''const sourceTextValues = new WeakMap<HostTextNode, string>()
'''
state_replacement = state_anchor + '''const browserInlineFlowNodes = new WeakSet<HostElementNode>()
'''
if "const browserInlineFlowNodes" not in universal:
    if state_anchor not in universal:
        raise SystemExit("inline flow state anchor missing")
    universal = universal.replace(state_anchor, state_replacement, 1)

insert_anchor = '''    insertHostNode(parent, node, anchor ?? null)
    if (node.kind === "element") reapplyNativeStyleSubtree(node)
    else applyNativeTextTransform(node)
    refreshInlineSvgFromParent(parent)
'''
insert_replacement = '''    insertHostNode(parent, node, anchor ?? null)
    if (node.kind === "element") reapplyNativeStyleSubtree(node)
    else applyNativeTextTransform(node)
    refreshBrowserInlineFlowParent(parent)
    refreshInlineSvgFromParent(parent)
'''
if insert_replacement not in universal:
    if insert_anchor not in universal:
        raise SystemExit("inline flow insert anchor missing")
    universal = universal.replace(insert_anchor, insert_replacement, 1)

remove_anchor = '''    if (node.kind === "element") classStyledNodes.delete(node)
    removeHostNode(parent, node)
    if (svgRoot) refreshInlineSvg(svgRoot)
'''
remove_replacement = '''    if (node.kind === "element") classStyledNodes.delete(node)
    removeHostNode(parent, node)
    refreshBrowserInlineFlowParent(parent)
    if (svgRoot) refreshInlineSvg(svgRoot)
'''
if remove_replacement not in universal:
    if remove_anchor not in universal:
        raise SystemExit("inline flow remove anchor missing")
    universal = universal.replace(remove_anchor, remove_replacement, 1)

style_anchor = '''  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle, selectOptionStyle)
  const parentWidth = resolvedNativeNodeSize(node.parent, "x")
'''
style_replacement = '''  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle, selectOptionStyle)
  const browserInlineFlow = resolveBrowserInlineFlowStyle(node, mergedStyle)
  if (browserInlineFlow) browserInlineFlowNodes.add(node)
  else browserInlineFlowNodes.delete(node)
  const flowedStyle = mergeNativeStyles(mergedStyle, browserInlineFlow)
  const parentWidth = resolvedNativeNodeSize(node.parent, "x")
'''
if style_replacement not in universal:
    if style_anchor not in universal:
        raise SystemExit("inline flow style anchor missing")
    universal = universal.replace(style_anchor, style_replacement, 1)

position_anchor = '''  const positionedStyle = applyNativeStyleParentPosition(
    mergedStyle,
    classParentPosition,
'''
position_replacement = '''  const positionedStyle = applyNativeStyleParentPosition(
    flowedStyle,
    classParentPosition,
'''
if position_replacement not in universal:
    if position_anchor not in universal:
        raise SystemExit("inline flow position anchor missing")
    universal = universal.replace(position_anchor, position_replacement, 1)

helper_anchor = '''function applyNativeTextTransform(node: HostTextNode): void {
'''
helper = '''function browserInlineFlowEligible(node: HostElementNode): boolean {
  if (node.nativeType !== "div" || sourceDisplay(node) !== undefined) return false

  let inlineChildren = 0
  for (const child of node.children) {
    if (child.kind === "text") {
      if (child.text.length === 0) continue
      inlineChildren += 1
      continue
    }

    const semanticTag = semanticTags.get(child)
    if (!semanticTag || !INLINE_TEXT_SEMANTIC_TAGS.has(semanticTag) || sourceDisplay(child) !== undefined) {
      return false
    }
    inlineChildren += 1
  }
  return inlineChildren >= 2
}

function refreshBrowserInlineFlowParent(parent: HostParent): void {
  if (parent.kind !== "element") return
  if (browserInlineFlowNodes.has(parent) || browserInlineFlowEligible(parent)) applyNativeStyleState(parent)
}

function resolveBrowserInlineFlowStyle(
  node: HostElementNode,
  style: StyleDesc | undefined,
): StyleDesc | undefined {
  if (style?.display !== undefined || !browserInlineFlowEligible(node)) return undefined
  const flowStyle: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  }
  if (style?.textAlign === "center") flowStyle.justifyContent = "center"
  else if (style?.textAlign === "right") flowStyle.justifyContent = "flex-end"
  return flowStyle
}

'''
if "function resolveBrowserInlineFlowStyle" not in universal:
    if helper_anchor not in universal:
        raise SystemExit("inline flow helper anchor missing")
    universal = universal.replace(helper_anchor, helper + helper_anchor, 1)

universal_path.write_text(universal)

test_path = ROOT / "examples/solid1-tailwind/src/test.tsx"
test = test_path.read_text()
end_anchor = '''  app.unmount()
  console.log("solid1 Tailwind native bridge: passed")
}
'''
end_replacement = '''  app.unmount()

  const inlineFlow = createTestRoot(600, 120)
  const bpm = "118.00"
  const confidence = "94"
  const lowAlternative = "59.00"
  const highAlternative = "236.00"
  inlineFlow.render(() => (
    <div style={{ width: 458 }}>
      <div testId="mixed-inline-text" style={{ width: 458, fontSize: 12, lineHeight: 16 }}>
        Suggested {bpm} BPM, confidence {confidence}%.{" Applied."}
      </div>
      <div testId="mixed-inline-spans" style={{ width: 458, fontSize: 12, lineHeight: 16 }}>
        Alternatives: <span>{lowAlternative}</span><span>, {highAlternative}</span>
      </div>
      <div
        testId="explicit-column-text"
        style={{ display: "flex", flexDirection: "column", width: 458, fontSize: 12, lineHeight: 16 }}
      >
        {"First"}{"Second"}
      </div>
    </div>
  ))
  requireEqual(inlineFlow.renderer.boundsTestId("mixed-inline-text").height, 16, "mixed browser text fragments should share one native line")
  requireEqual(inlineFlow.renderer.boundsTestId("mixed-inline-spans").height, 16, "inline span fragments should share the surrounding native line")
  requireEqual(inlineFlow.renderer.boundsTestId("explicit-column-text").height, 32, "explicit source flex-column layout must override inline-flow fallback")
  inlineFlow.unmount()

  console.log("solid1 Tailwind native bridge: passed")
}
'''
if end_replacement not in test:
    if end_anchor not in test:
        raise SystemExit("inline flow Tailwind regression anchor missing")
    test = test.replace(end_anchor, end_replacement, 1)
test_path.write_text(test)
