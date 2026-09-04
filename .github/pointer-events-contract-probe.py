from pathlib import Path

# Only semantic interactive controls gain a host-owned pointerEvents:auto surface.
# Plain event-bearing divs intentionally keep their previous native behavior.

path = Path("packages/solid/test/host-tree.test.ts")
text = path.read_text()
insert_before = '''  it("preserves recreated event handlers when destroy and recreate share a batch", () => {'''
contract = '''  it("materializes pointer ownership for semantic controls and clears it with the handler", () => {\n    const { renderer, driver, root } = fixture()\n    const node = createHostElement("div", "button")\n    insertHostNode(root, node)\n    driver.flush()\n\n    setHostProperty(node, "onClick", () => {}, undefined)\n    driver.flush()\n    expect(renderer.batches.at(-1)).toEqual([\n      ["setEventListener", 1, "click", true],\n      ["setStyle", 1, { pointerEvents: "auto" }],\n    ])\n\n    setHostProperty(node, "onClick", undefined, () => {})\n    driver.flush()\n    expect(renderer.batches.at(-1)).toEqual([\n      ["setEventListener", 1, "click", false],\n      ["setStyle", 1, {}],\n    ])\n  })\n\n  it("does not turn a plain event container into an extra native hit surface", () => {\n    const { renderer, driver, root } = fixture()\n    const node = createHostElement("div")\n    setHostProperty(node, "onClick", () => {}, undefined)\n    insertHostNode(root, node)\n    driver.flush()\n\n    expect(renderer.batches[0]).toEqual([\n      ["createElement", 1, "div"],\n      ["setEventListener", 1, "click", true],\n      ["setRoot", 1],\n    ])\n  })\n\n  it("preserves inherited pointer-events none and explicit descendant auto", () => {\n    const { renderer, driver, root } = fixture()\n    const parent = createHostElement("div")\n    const blocked = createHostElement("div", "button")\n    const reenabled = createHostElement("div", "button")\n    setHostProperty(parent, "style", { pointerEvents: "none" }, undefined)\n    setHostProperty(blocked, "onClick", () => {}, undefined)\n    setHostProperty(reenabled, "style", { pointerEvents: "auto" }, undefined)\n    setHostProperty(reenabled, "onClick", () => {}, undefined)\n    insertHostNode(parent, blocked)\n    insertHostNode(parent, reenabled)\n    insertHostNode(root, parent)\n    driver.flush()\n\n    const batch = renderer.batches[0]\n    expect(batch).toContainEqual(["setStyle", blocked.id, { pointerEvents: "none" }])\n    expect(batch).toContainEqual(["setStyle", reenabled.id, { pointerEvents: "auto" }])\n  })\n\n'''
if insert_before not in text:
    raise SystemExit("host-tree contract insertion anchor missing")
path.write_text(text.replace(insert_before, contract + insert_before, 1))

# The retained native input is a semantic interactive control; its native snapshot
# should make the compatibility-owned hit surface visible.
path = Path("packages/solid/test/native-retained-tree-parity.test.ts")
text = path.read_text()
old = '''            "style": {\n              "height": 40,\n              "width": 240,\n            },'''
new = '''            "style": {\n              "height": 40,\n              "pointerEvents": "auto",\n              "width": 240,\n            },'''
if old not in text:
    raise SystemExit("retained input snapshot anchor missing")
path.write_text(text.replace(old, new, 1))
