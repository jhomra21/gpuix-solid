from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
testing_path = ROOT / "packages/solid1/src/testing.ts"
testing = testing_path.read_text()

helper_anchor = '''function findNodeByCustomProps(node: NativeTreeNode | null, query: TestCustomPropQuery): NativeTreeNode | undefined {
  if (!node) return undefined
  if (matchesCustomProps(node, query)) return node
  for (const child of node.children ?? []) {
    const found = findNodeByCustomProps(child, query)
    if (found) return found
  }
  return undefined
}
'''
helper_replacement = helper_anchor + '''
function findNodeById(node: NativeTreeNode | null, id: number): NativeTreeNode | undefined {
  if (!node) return undefined
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return undefined
}
'''
if "function findNodeById" not in testing:
    if helper_anchor not in testing:
        raise SystemExit("solid1 testing node-id helper anchor missing")
    testing = testing.replace(helper_anchor, helper_replacement, 1)

method_anchor = '''  dragCustomProps(query: TestCustomPropQuery, deltaX: number, deltaY: number): void {
    const start = insetPoint(this.boundsCustomProps(query))
    const endX = start.x + deltaX
    const endY = start.y + deltaY
    this.#native.simulateMouseMove(start.x, start.y)
    this.dispatchNativeEvents()
    this.#native.flush()
    this.#native.simulateMouseDown(start.x, start.y, 0)
    this.dispatchNativeEvents()
    this.#native.flush()
    this.#native.simulateMouseMove(endX, endY, 0)
    this.dispatchNativeEvents()
    this.#native.flush()
    this.#native.simulateMouseUp(endX, endY, 0)
    this.dispatchNativeEvents()
    this.#native.flush()
  }
'''
trace_method = method_anchor + '''
  dragCustomPropsTrace(query: TestCustomPropQuery, deltaX: number, deltaY: number) {
    const root = this.#root
    if (!root) throw new Error("TestRenderer is not bound to a Solid 1 root")
    const node = this.requireCustomProps(query)
    const nodeBounds = this.boundsNode(node, `custom props ${JSON.stringify(query)}`)
    const start = insetPoint(nodeBounds)
    const endX = start.x + deltaX
    const endY = start.y + deltaY
    const trace: Array<{
      elementId: number
      eventType: string
      type?: string | undefined
      testId?: string | undefined
      customProps?: Record<string, MutationValue> | undefined
      bounds?: TestBounds | undefined
    }> = []
    const tree = parseTree(this.#native.getTreeJson())
    const summarizeNode = (target: NativeTreeNode) => {
      const nativeBounds = this.#native.getElementBounds(target.id)
      const bounds = nativeBounds && nativeBounds.length >= 4
        ? { x: nativeBounds[0] ?? 0, y: nativeBounds[1] ?? 0, width: nativeBounds[2] ?? 0, height: nativeBounds[3] ?? 0 }
        : undefined
      return {
        id: target.id,
        type: target.type,
        text: nodeText(target).replace(/\\s+/g, " ").trim().slice(0, 120),
        testId: target.testId,
        style: target.style,
        bounds,
      }
    }
    const summarizeDescendants = (target: NativeTreeNode, maxDepth: number) => {
      const descendants: Array<{
        depth: number
        parentId: number
        node: ReturnType<typeof summarizeNode>
      }> = []
      let level = (target.children ?? []).map((child) => ({ child, parentId: target.id }))
      for (let depth = 1; depth <= maxDepth && level.length > 0; depth += 1) {
        const next: typeof level = []
        for (const entry of level) {
          descendants.push({ depth, parentId: entry.parentId, node: summarizeNode(entry.child) })
          for (const child of entry.child.children ?? []) next.push({ child, parentId: entry.child.id })
        }
        level = next
      }
      return descendants
    }
    const ancestors: Array<ReturnType<typeof summarizeNode>> = []
    const ancestorChildren: Array<{
      ancestorId: number
      children: Array<ReturnType<typeof summarizeNode>>
      descendants: ReturnType<typeof summarizeDescendants>
    }> = []
    if (tree) {
      let currentId = node.id
      for (;;) {
        const parent = findParentNode(tree, currentId)
        if (!parent) break
        ancestors.push(summarizeNode(parent))
        if (ancestorChildren.length < 3) {
          ancestorChildren.push({
            ancestorId: parent.id,
            children: (parent.children ?? []).map(summarizeNode),
            descendants: summarizeDescendants(parent, 4),
          })
        }
        currentId = parent.id
      }
    }
    const dispatch = () => {
      const events = this.#native.drainEvents()
      const currentTree = parseTree(this.#native.getTreeJson())
      for (const event of events) {
        const target = findNodeById(currentTree, event.elementId)
        const nativeBounds = target ? this.#native.getElementBounds(target.id) : null
        const bounds = nativeBounds && nativeBounds.length >= 4
          ? { x: nativeBounds[0] ?? 0, y: nativeBounds[1] ?? 0, width: nativeBounds[2] ?? 0, height: nativeBounds[3] ?? 0 }
          : undefined
        trace.push({
          elementId: event.elementId,
          eventType: event.eventType,
          type: target?.type,
          testId: target?.testId,
          customProps: target?.customProps,
          bounds,
        })
        root.dispatch(event)
      }
      this.#native.flush()
    }
    this.#native.simulateMouseMove(start.x, start.y)
    dispatch()
    this.#native.simulateMouseDown(start.x, start.y, 0)
    dispatch()
    this.#native.simulateMouseMove(endX, endY, 0)
    dispatch()
    this.#native.simulateMouseUp(endX, endY, 0)
    dispatch()
    return { nodeId: node.id, nodeBounds, start, end: { x: endX, y: endY }, ancestors, ancestorChildren, events: trace }
  }
'''
if "dragCustomPropsTrace(query" not in testing:
    if method_anchor not in testing:
        raise SystemExit("solid1 dragCustomProps trace anchor missing")
    testing = testing.replace(method_anchor, trace_method, 1)

testing_path.write_text(testing)

test_path = ROOT / "examples/solid1-daw/src/test.tsx"
test = test_path.read_text()
old = '''  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  app.renderer.dragCustomProps(gainInput, 20, 0)
  const gainAfter = app.renderer.customPropByCustomProps(gainInput, "value")
  requireCondition(gainAfter !== gainBefore, `exact Clip Gain range should update fixture clip state: ${JSON.stringify(gainBefore)} -> ${JSON.stringify(gainAfter)}`)
'''
new = '''  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  const gainTrace = app.renderer.dragCustomPropsTrace(gainInput, 20, 0)
  const gainDown = gainTrace.events.find((event) => event.eventType === "mouseDown")
  requireCondition(gainDown?.elementId === gainTrace.nodeId, `exact Clip Gain mouseDown must target the retained range node: ${JSON.stringify(gainTrace)}`)
  const gainAfter = app.renderer.customPropByCustomProps(gainInput, "value")
  requireCondition(gainAfter !== gainBefore, `exact Clip Gain range should update fixture clip state: ${JSON.stringify(gainBefore)} -> ${JSON.stringify(gainAfter)}; trace=${JSON.stringify(gainTrace)}`)
'''
if new not in test:
    if old not in test:
        raise SystemExit("exact Clip Gain trace verifier anchor missing")
    test = test.replace(old, new, 1)
test_path.write_text(test)
