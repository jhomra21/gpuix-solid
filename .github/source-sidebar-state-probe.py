from pathlib import Path

sidebar_path = Path("examples/solid1-daw/src/native/SourceTrackSidebar.tsx")
sidebar = sidebar_path.read_text()
old_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
  })
'''
new_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
    console.log("source sidebar adapted state", JSON.stringify({
      nativeMuted: props.tracks[0]?.muted,
      adaptedMuted: sourceTrackStore.tracks[0]?.muted,
      nativeArmedTrackId: props.tracks.find((track) => track.armed)?.id ?? null,
      adaptedKind: sourceTrackStore.tracks[0]?.kind,
      adaptedChannelRole: sourceTrackStore.tracks[0]?.channelRole,
    }))
  })
'''
if old_sync not in sidebar:
    raise SystemExit("source track store probe anchor missing")
sidebar_path.write_text(sidebar.replace(old_sync, new_sync, 1))

timeline_path = Path("examples/solid1-daw/src/native/Timeline.tsx")
timeline = timeline_path.read_text()
old_arm = '          onToggleArm: (id) => updateTrack(id, (track) => ({ ...track, armed: !track.armed })),\n'
new_arm = '''          onToggleArm: (id) => {
            updateTrack(id, (track) => ({ ...track, armed: !track.armed }))
            console.log("source sidebar arm callback", JSON.stringify({
              id,
              armed: tracks().find((track) => track.id === id)?.armed,
              armedTrackIds: tracks().filter((track) => track.armed).map((track) => track.id),
            }))
          },
'''
if old_arm not in timeline:
    raise SystemExit("arm callback probe anchor missing")
timeline_path.write_text(timeline.replace(old_arm, new_arm, 1))

testing_path = Path("packages/solid1/src/testing.ts")
testing = testing_path.read_text()
find_anchor = '''function findFirstNodeOfType(node: NativeTreeNode, type: string): NativeTreeNode | undefined {
'''
find_probe = '''function findNodeById(node: NativeTreeNode | null, id: number): NativeTreeNode | undefined {
  if (!node) return undefined
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return undefined
}

function findFirstNodeOfType(node: NativeTreeNode, type: string): NativeTreeNode | undefined {
'''
if find_anchor not in testing:
    raise SystemExit("native hit target helper anchor missing")
testing = testing.replace(find_anchor, find_probe, 1)
click_anchor = '''  clickCustomProps(query: TestCustomPropQuery): void {
    const point = insetPoint(this.boundsNode(this.requireCustomProps(query), `custom props ${JSON.stringify(query)}`))
    this.#native.simulateClick(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }
'''
click_probe = '''  clickCustomProps(query: TestCustomPropQuery): void {
    const queriedNode = this.requireCustomProps(query)
    const point = insetPoint(this.boundsNode(queriedNode, `custom props ${JSON.stringify(query)}`))
    if (query["aria-label"] === "Arm track 1 for recording") {
      const tree = parseTree(this.#native.getTreeJson())
      const containing: Array<Record<string, unknown>> = []
      let order = 0
      const summarize = (node: NativeTreeNode, parentId: number | null, depth: number) => {
        const nativeBounds = this.#native.getElementBounds(node.id)
        return {
          id: node.id,
          parentId,
          depth,
          type: node.type,
          bounds: nativeBounds && nativeBounds.length >= 4
            ? { x: nativeBounds[0], y: nativeBounds[1], width: nativeBounds[2], height: nativeBounds[3] }
            : null,
          text: node.text ?? null,
          ariaLabel: node.customProps?.["aria-label"] ?? null,
          title: node.customProps?.title ?? null,
          disabled: node.customProps?.disabled ?? null,
          pointerEvents: node.style?.pointerEvents ?? null,
          display: node.style?.display ?? null,
          position: node.style?.position ?? null,
          top: node.style?.top ?? null,
          right: node.style?.right ?? null,
          bottom: node.style?.bottom ?? null,
          left: node.style?.left ?? null,
          height: node.style?.height ?? null,
          minHeight: node.style?.minHeight ?? null,
          flexGrow: node.style?.flexGrow ?? null,
          flexShrink: node.style?.flexShrink ?? null,
          overflow: node.style?.overflow ?? null,
          overflowX: node.style?.overflowX ?? null,
          overflowY: node.style?.overflowY ?? null,
          backgroundColor: node.style?.backgroundColor ?? null,
        }
      }
      const visit = (node: NativeTreeNode, depth: number, parentId: number | null) => {
        order += 1
        const summary = summarize(node, parentId, depth)
        const bounds = summary.bounds as { x: number; y: number; width: number; height: number } | null
        if (bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
          containing.push({ order, ...summary })
        }
        for (const child of node.children ?? []) visit(child, depth + 1, node.id)
      }
      if (tree) visit(tree, 0, null)
      const parent = tree ? findParentNode(tree, queriedNode.id) : undefined
      const row = tree ? findNodeById(tree, 742) : undefined
      console.log("source sidebar arm hit stack", JSON.stringify({
        point,
        queriedNodeId: queriedNode.id,
        queriedParentId: parent?.id ?? null,
        queriedBounds: this.#native.getElementBounds(queriedNode.id),
        siblings: (parent?.children ?? []).map((node) => summarize(node, parent?.id ?? null, 0)),
        row742: row ? {
          self: summarize(row, tree ? findParentNode(tree, row.id)?.id ?? null : null, 0),
          children: (row.children ?? []).map((node) => summarize(node, row.id, 1)),
        } : null,
        containing,
      }))
    }
    this.#native.simulateClick(point.x, point.y)
    const root = this.#root
    if (!root) throw new Error("TestRenderer is not bound to a Solid 1 root")
    for (;;) {
      const events = this.#native.drainEvents()
      if (events.length === 0) break
      const tree = parseTree(this.#native.getTreeJson())
      for (const event of events) {
        const target = findNodeById(tree, event.elementId)
        const path: Array<Record<string, unknown>> = []
        if (tree && target) {
          let current: NativeTreeNode | undefined = target
          for (;;) {
            path.push({
              id: current.id,
              type: current.type,
              testId: current.testId ?? null,
              ariaLabel: current.customProps?.["aria-label"] ?? null,
              title: current.customProps?.title ?? null,
              disabled: current.customProps?.disabled ?? null,
              pointerEvents: current.style?.pointerEvents ?? null,
            })
            const parent = findParentNode(tree, current.id)
            if (!parent) break
            current = parent
          }
        }
        console.log("source sidebar custom click target", JSON.stringify({ query, point, elementId: event.elementId, path }))
        root.dispatch(event)
      }
    }
    this.#native.flush()
  }
'''
if click_anchor not in testing:
    raise SystemExit("native hit target click anchor missing")
testing_path.write_text(testing.replace(click_anchor, click_probe, 1))

test_path = Path("examples/solid1-daw/src/test.tsx")
test = test_path.read_text()
mute_anchor = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  app.renderer.clickCustomProps(muteOn)
'''
mute_probe = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  console.log("source sidebar mute geometry", JSON.stringify({
    button: app.renderer.boundsCustomProps(muteOn),
    ancestors: app.renderer.ancestorBoundsCustomProps(muteOn),
  }))
  app.renderer.clickCustomProps(muteOn)
'''
if mute_anchor not in test:
    raise SystemExit("mute geometry probe anchor missing")
test = test.replace(mute_anchor, mute_probe, 1)
arm_anchor = '''  app.renderer.clickCustomProps(armOff)
  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")
'''
arm_probe = '''  console.log("source sidebar arm geometry", JSON.stringify({
    button: app.renderer.boundsCustomProps(armOff),
    ancestors: app.renderer.ancestorBoundsCustomProps(armOff),
    disabled: app.renderer.customPropByCustomProps(armOff, "disabled"),
    ariaPressed: app.renderer.customPropByCustomProps(armOff, "aria-pressed"),
  }))
  app.renderer.clickCustomProps(armOff)
  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")
'''
if arm_anchor not in test:
    raise SystemExit("arm geometry probe anchor missing")
test_path.write_text(test.replace(arm_anchor, arm_probe, 1))
