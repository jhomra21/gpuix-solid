from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for relative in ["packages/solid1/src/host/nodes.ts", "packages/solid/src/host/nodes.ts"]:
    path = ROOT / relative
    text = path.read_text()
    old = '''  const style = isRangeInput(node)
    ? { minHeight: 16, height: 16, width: "100%", ...node.style }
    : node.style
'''
    new = '''  const style = isRangeInput(node)
    ? { minHeight: 16, height: 16, width: 129, minWidth: 129, ...node.style }
    : node.style
'''
    if new not in text:
        if old not in text:
            raise SystemExit(f"range intrinsic width anchor missing in {relative}")
        text = text.replace(old, new, 1)
    path.write_text(text)

test_path = ROOT / "packages/solid/test/native-event-input-parity.test.ts"
test = test_path.read_text()
anchor = '''  nativeIt("supports textarea newline editing and submission", () => {
'''
case = '''  nativeIt("gives an unstyled controlled range intrinsic bounds and commits a drag", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("0")
    let range: ReturnType<typeof createElement> | undefined

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 80 })

      range = createElement("input")
      setProp(range, "type", "range")
      setProp(range, "min", "-60")
      setProp(range, "max", "6.02")
      setProp(range, "step", "0.1")
      setProp(range, "onChange", () => {
        if (range) setValue(range.value)
      })
      bindValue(range, value)

      insertNode(root, range)
      return root
    })

    expect(range).toBeDefined()
    const bounds = range?.getBoundingClientRect()
    expect(bounds?.width).toBeGreaterThan(100)
    expect(bounds?.height).toBeGreaterThan(0)

    const startX = (bounds?.left ?? 0) + 4
    const y = (bounds?.top ?? 0) + (bounds?.height ?? 0) / 2
    testRoot.renderer.nativeSimulateMouseDown(startX, y, 0)
    testRoot.renderer.nativeSimulateMouseMove(startX + 20, y, 0)
    testRoot.renderer.nativeSimulateMouseUp(startX + 20, y, 0)

    expect(value).not.toBe("0")
    expect(Number(value())).toBeGreaterThan(-60)
    testRoot.unmount()
  })

  nativeIt("supports textarea newline editing and submission", () => {
'''
if "gives an unstyled controlled range intrinsic bounds and commits a drag" not in test:
    if anchor not in test:
        raise SystemExit("native range test insertion anchor missing")
    test = test.replace(anchor, case, 1)
test_path.write_text(test)
