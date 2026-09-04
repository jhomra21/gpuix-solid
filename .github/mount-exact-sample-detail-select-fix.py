from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Semantic <select> is backed by a native div. Preserve the controlled value on
# that host so retained-tree/native tests can observe browser form state.
for relative in ["packages/solid1/src/host/nodes.ts", "packages/solid/src/host/nodes.ts"]:
    path = ROOT / relative
    text = path.read_text()

    helper_old = '''function isForwardedBuiltInProp(name: string): boolean {
  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" || name.startsWith("aria-")
}
'''
    helper_new = '''function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {
  return UNIVERSAL_PROPS.has(name) ||
    name === "hidden" ||
    name === "role" ||
    name.startsWith("aria-") ||
    (node.localName === "select" && name === "value")
}
'''
    if helper_new not in text:
        if helper_old not in text:
            raise SystemExit(f"built-in prop forwarding helper anchor missing in {relative}")
        text = text.replace(helper_old, helper_new, 1)

    text = text.replace(
        'if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(name)) return',
        'if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(node, name)) return',
    )
    text = text.replace(
        'if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(name)) continue',
        'if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(node, name)) continue',
    )
    if '!isForwardedBuiltInProp(name)' in text:
        raise SystemExit(f"unconverted built-in forwarding call remains in {relative}")
    path.write_text(text)

# Solid1 supports browser semantic select/option elements. Keep the source DOM
# intact but paint only the option selected by the controlled value, matching
# collapsed browser-select presentation. Recompute when the controlled value
# changes so programmatic source updates remain reactive.
universal_path = ROOT / "packages/solid1/src/universal.ts"
universal = universal_path.read_text()

set_property_old = '''    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
'''
set_property_new = '''    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && semanticTags.get(node) === "select" && name === "value") {
      for (const child of node.children) {
        if (child.kind === "element") reapplyNativeStyleSubtree(child)
      }
    }
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
'''
if 'semanticTags.get(node) === "select" && name === "value"' not in universal:
    if set_property_old not in universal:
        raise SystemExit("Solid1 semantic select value-update anchor missing")
    universal = universal.replace(set_property_old, set_property_new, 1)

hidden_old = '''  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined
  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle)
'''
hidden_new = '''  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined
  const selectOptionStyle: StyleDesc | undefined = isUnselectedSelectOption(node) ? { display: "none" } : undefined
  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle, selectOptionStyle)
'''
if 'const selectOptionStyle:' not in universal:
    if hidden_old not in universal:
        raise SystemExit("Solid1 semantic select option-style anchor missing")
    universal = universal.replace(hidden_old, hidden_new, 1)

helper_anchor = '''function applyNativeTextTransform(node: HostTextNode): void {
'''
helper = '''function isUnselectedSelectOption(node: HostElementNode): boolean {
  if (semanticTags.get(node) !== "option") return false
  const parent = node.parent
  if (!parent || parent.kind !== "element" || semanticTags.get(parent) !== "select") return false

  const options = parent.children.filter(
    (child): child is HostElementNode => child.kind === "element" && semanticTags.get(child) === "option",
  )
  const selected = parent.props.get("value")
  if (selected === undefined || selected === null) return options[0] !== node

  const explicitValue = node.props.get("value")
  const optionValue = explicitValue === undefined || explicitValue === null
    ? node.children.map((child) => child.kind === "text" ? child.text : "").join("")
    : String(explicitValue)
  return optionValue !== String(selected)
}

function applyNativeTextTransform(node: HostTextNode): void {
'''
if 'function isUnselectedSelectOption' not in universal:
    if helper_anchor not in universal:
        raise SystemExit("Solid1 semantic select helper anchor missing")
    universal = universal.replace(helper_anchor, helper, 1)

universal_path.write_text(universal)

# Change detector: semantic select keeps browser form state while the host uses a
# native div, and its collapsed presentation swaps the visible option reactively.
parity_path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
parity = parity_path.read_text()
import_anchor = '''import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"
'''
import_replacement = '''import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"
import { createElement as createSemanticElement, createTextNode as createSemanticText, insertNode as insertSemanticNode, setProp as setSemanticProp } from "../src/universal.ts"
'''
if 'createSemanticElement' not in parity:
    if import_anchor not in parity:
        raise SystemExit("Solid1 semantic select parity import anchor missing")
    parity = parity.replace(import_anchor, import_replacement, 1)

parity_anchor = '''const semanticButton = createHostElement("div", "button")
'''
parity_test = '''const semanticSelect = createSemanticElement("select")
const repitchOption = createSemanticElement("option")
const stretchOption = createSemanticElement("option")
if (semanticSelect.kind !== "element" || repitchOption.kind !== "element" || stretchOption.kind !== "element") {
  throw new Error("semantic select fixture must create host elements")
}
setSemanticProp(repitchOption, "value", "repitch", undefined)
setSemanticProp(stretchOption, "value", "stretch", undefined)
insertSemanticNode(repitchOption, createSemanticText("Re-Pitch"))
insertSemanticNode(stretchOption, createSemanticText("Stretch"))
setSemanticProp(semanticSelect, "value", "repitch", undefined)
insertSemanticNode(semanticSelect, repitchOption)
insertSemanticNode(semanticSelect, stretchOption)
if (semanticSelect.value !== "repitch") throw new Error("semantic select must retain its controlled browser value")
if (repitchOption.style.display === "none" || stretchOption.style.display !== "none") {
  throw new Error(`collapsed semantic select must paint only the selected option: ${JSON.stringify({ repitch: repitchOption.style, stretch: stretchOption.style })}`)
}
setSemanticProp(semanticSelect, "value", "stretch", "repitch")
if (semanticSelect.value !== "stretch") throw new Error("semantic select controlled value must update reactively")
if (repitchOption.style.display !== "none" || stretchOption.style.display === "none") {
  throw new Error(`semantic select value update must swap the painted option: ${JSON.stringify({ repitch: repitchOption.style, stretch: stretchOption.style })}`)
}

const semanticButton = createHostElement("div", "button")
'''
if 'collapsed semantic select must paint only the selected option' not in parity:
    if parity_anchor not in parity:
        raise SystemExit("Solid1 semantic select parity insertion anchor missing")
    parity = parity.replace(parity_anchor, parity_test, 1)
parity_path.write_text(parity)

# Shared-host mutation test: a semantic select may forward only its browser value;
# ordinary native divs remain on the existing universal-prop allowlist.
prop_path = ROOT / "packages/solid/test/prop-parity.test.ts"
prop = prop_path.read_text()
prop_anchor = '''  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
prop_test = '''  it("forwards controlled value for a semantic select backed by a native div", () => {
    const { renderer, driver, root } = fixture()
    const select = createHostElement("div", "select")

    setHostProperty(select, "value", "repitch", undefined)
    setHostProperty(select, "src", "still-ignored", undefined)
    insertHostNode(root, select)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["setCustomProp", 1, "value", "repitch"],
      ["setRoot", 1],
    ])

    setHostProperty(select, "value", "stretch", "repitch")
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([["setCustomProp", 1, "value", "stretch"]])
  })

  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
if 'forwards controlled value for a semantic select backed by a native div' not in prop:
    if prop_anchor not in prop:
        raise SystemExit("semantic select prop-parity insertion anchor missing")
    prop = prop.replace(prop_anchor, prop_test, 1)
prop_path.write_text(prop)
