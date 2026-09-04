from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
web_path = ROOT / "packages/solid1/src/web.ts"
parity_path = ROOT / "packages/solid1/scripts/check-host-parity.ts"

web = web_path.read_text()
old_promotion = '''  // SAFETY: HostElementNode.type is writable at runtime while detached; changing it before adoption controls only the native createElement opcode while semantic div metadata remains unchanged for Kobalte.\n  Object.defineProperty(element, "type", {\n    configurable: true,\n    enumerable: true,\n    writable: false,\n    value: "anchored",\n  })\n'''
new_promotion = '''  element.nativeType = "anchored"\n'''
if web.count(old_promotion) != 1:
    raise SystemExit("Kobalte popper promotion anchor changed")
web_path.write_text(web.replace(old_promotion, new_promotion, 1))

parity = parity_path.read_text()
old_import = 'import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"\n'
new_import = 'import { HostElementNode, createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"\nimport { createDynamic } from "../src/web.ts"\n'
if parity.count(old_import) != 1:
    raise SystemExit("host parity import anchor changed")
parity = parity.replace(old_import, new_import, 1)

anchor = '''const semanticButton = createHostElement("div", "button")\nif (semanticButton.localName !== "button" || semanticButton.tagName !== "BUTTON") throw new Error("host must retain semantic tag identity")\n'''
addition = '''const popperPositioner = createDynamic(() => "div", { "data-popper-positioner": "" })\nif (!(popperPositioner instanceof HostElementNode)) throw new Error("popper positioner must remain a host element")\nif (popperPositioner.type !== "div" || popperPositioner.nativeType !== "anchored") {\n  throw new Error(`popper positioner must preserve semantic div identity while adopting as anchored: ${popperPositioner.type}/${popperPositioner.nativeType}`)\n}\n\n'''
if parity.count(anchor) != 1:
    raise SystemExit("host parity semantic anchor changed")
parity_path.write_text(parity.replace(anchor, addition + anchor, 1))
