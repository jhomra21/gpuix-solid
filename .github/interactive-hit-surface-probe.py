from pathlib import Path

path = Path("packages/solid1/src/universal.ts")
source = path.read_text()

set_property_anchor = '''    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
'''
set_property_replacement = '''    setHostProperty(node, name, value, previous)
    if (
      node.kind === "element" &&
      (name.startsWith("data-") || name.startsWith("aria-") || name.startsWith("on"))
    ) {
      reapplyNativeStyleSubtree(node)
    }
'''
if set_property_anchor not in source:
    raise SystemExit("setProperty reapply anchor missing")
source = source.replace(set_property_anchor, set_property_replacement, 1)

merge_anchor = '''  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined
  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle)
'''
merge_replacement = '''  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined
  const sourceStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle)
  const interactiveHitStyle: StyleDesc | undefined =
    node.events.size > 0 &&
    sourceStyle?.pointerEvents !== "none" &&
    sourceStyle?.background === undefined &&
    sourceStyle?.backgroundColor === undefined
      ? { backgroundColor: "rgba(0, 0, 0, 0)" }
      : undefined
  const mergedStyle = mergeNativeStyles(sourceStyle, interactiveHitStyle)
'''
if merge_anchor not in source:
    raise SystemExit("native style merge anchor missing")
source = source.replace(merge_anchor, merge_replacement, 1)

path.write_text(source)
