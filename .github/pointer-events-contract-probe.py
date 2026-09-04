from pathlib import Path

# Update only the existing assertions whose published native surface intentionally
# gains pointerEvents:auto for event-owning browser elements.

path = Path("packages/solid/test/prop-parity.test.ts")
text = path.read_text()
old = '''    expect(renderer.batches[0]).toEqual([\n      ["createElement", 1, "div"],\n      ["setEventListener", 1, "click", true],\n      ["setRoot", 1],\n    ])'''
new = '''    expect(renderer.batches[0]).toEqual([\n      ["createElement", 1, "div"],\n      ["setStyle", 1, { pointerEvents: "auto" }],\n      ["setEventListener", 1, "click", true],\n      ["setRoot", 1],\n    ])'''
if old not in text:
    raise SystemExit("prop parity event batch anchor missing")
path.write_text(text.replace(old, new, 1))

path = Path("packages/solid/test/host-tree.test.ts")
text = path.read_text()
old = '''    expect(renderer.batches.at(-1)).toEqual([\n      ["createElement", 2, "div"],\n      ["setEventListener", 2, "click", true],\n      ["createElement", 3, "text"],'''
new = '''    expect(renderer.batches.at(-1)).toEqual([\n      ["createElement", 2, "div"],\n      ["setStyle", 2, { pointerEvents: "auto" }],\n      ["setEventListener", 2, "click", true],\n      ["createElement", 3, "text"],'''
if old not in text:
    raise SystemExit("host-tree recreated event batch anchor missing")
text = text.replace(old, new, 1)

insert_before = '''  it("preserves recreated event handlers when destroy and recreate share a batch", () => {'''
contract = '''  it("materializes browser pointer ownership only while native handlers need it", () => {\n    const { renderer, driver, root } = fixture()\n    const node = createHostElement("div")\n    insertHostNode(root, node)\n    driver.flush()\n\n    setHostProperty(node, "onClick", () => {}, undefined)\n    driver.flush()\n    expect(renderer.batches.at(-1)).toEqual([\n      ["setEventListener", 1, "click", true],\n      ["setStyle", 1, { pointerEvents: "auto" }],\n    ])\n\n    setHostProperty(node, "onClick", undefined, () => {})\n    driver.flush()\n    expect(renderer.batches.at(-1)).toEqual([\n      ["setEventListener", 1, "click", false],\n      ["setStyle", 1, {}],\n    ])\n  })\n\n  it("preserves inherited pointer-events none and explicit descendant auto", () => {\n    const { renderer, driver, root } = fixture()\n    const parent = createHostElement("div")\n    const blocked = createHostElement("div")\n    const reenabled = createHostElement("div")\n    setHostProperty(parent, "style", { pointerEvents: "none" }, undefined)\n    setHostProperty(blocked, "onClick", () => {}, undefined)\n    setHostProperty(reenabled, "style", { pointerEvents: "auto" }, undefined)\n    setHostProperty(reenabled, "onClick", () => {}, undefined)\n    insertHostNode(parent, blocked)\n    insertHostNode(parent, reenabled)\n    insertHostNode(root, parent)\n    driver.flush()\n\n    const batch = renderer.batches[0]\n    expect(batch).toContainEqual(["setStyle", blocked.id, { pointerEvents: "none" }])\n    expect(batch).toContainEqual(["setStyle", reenabled.id, { pointerEvents: "auto" }])\n  })\n\n'''
if insert_before not in text:
    raise SystemExit("host-tree contract insertion anchor missing")
path.write_text(text.replace(insert_before, contract + insert_before, 1))

path = Path("packages/solid/test/host-published-parity.test.ts")
text = path.read_text()
old = '''    expect(batch).toContainEqual(["setStyle", 1, { background: gradient }])'''
new = '''    expect(batch).toContainEqual(["setStyle", 1, { background: gradient, pointerEvents: "auto" }])'''
if old not in text:
    raise SystemExit("published style assertion anchor missing")
path.write_text(text.replace(old, new, 1))

path = Path("packages/solid/test/native-retained-tree-parity.test.ts")
text = path.read_text()
old = '''            "style": {\n              "height": 40,\n              "width": 240,\n            },'''
new = '''            "style": {\n              "height": 40,\n              "pointerEvents": "auto",\n              "width": 240,\n            },'''
if old not in text:
    raise SystemExit("retained input snapshot anchor missing")
text = text.replace(old, new, 1)
old = '''        "style": {\n          "height": 120,\n          "width": 320,\n        },'''
new = '''        "style": {\n          "height": 120,\n          "pointerEvents": "auto",\n          "width": 320,\n        },'''
if old not in text:
    raise SystemExit("retained root snapshot anchor missing")
path.write_text(text.replace(old, new, 1))
