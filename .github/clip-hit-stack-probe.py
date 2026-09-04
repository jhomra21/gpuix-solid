from pathlib import Path

path = Path("packages/solid1/src/testing.ts")
source = path.read_text()

anchor = '''    if (query["aria-label"] === "Arm track 1 for recording") {
'''
probe = '''    if (query.title === "Drum Loop 01") {
      const tree = parseTree(this.#native.getTreeJson())
      const summarizeClipNode = (node: NativeTreeNode, parentId: number | null, depth: number) => {
        const nativeBounds = this.#native.getElementBounds(node.id)
        return {
          id: node.id,
          parentId,
          depth,
          type: node.type,
          bounds: nativeBounds && nativeBounds.length >= 4
            ? { x: nativeBounds[0], y: nativeBounds[1], width: nativeBounds[2], height: nativeBounds[3] }
            : null,
          testId: node.testId ?? null,
          ariaLabel: node.customProps?.["aria-label"] ?? null,
          title: node.customProps?.title ?? null,
          role: node.customProps?.role ?? null,
          pointerEvents: node.style?.pointerEvents ?? null,
          position: node.style?.position ?? null,
          top: node.style?.top ?? null,
          right: node.style?.right ?? null,
          bottom: node.style?.bottom ?? null,
          left: node.style?.left ?? null,
          width: node.style?.width ?? null,
          height: node.style?.height ?? null,
          zIndex: node.style?.zIndex ?? null,
          overflow: node.style?.overflow ?? null,
          backgroundColor: node.style?.backgroundColor ?? null,
        }
      }
      const containing: Array<Record<string, unknown>> = []
      const visitClip = (node: NativeTreeNode, depth: number, parentId: number | null) => {
        const summary = summarizeClipNode(node, parentId, depth)
        const bounds = summary.bounds as { x: number; y: number; width: number; height: number } | null
        if (bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
          containing.push(summary)
        }
        for (const child of node.children ?? []) visitClip(child, depth + 1, node.id)
      }
      if (tree) visitClip(tree, 0, null)
      console.log("exact clip hit stack", JSON.stringify({
        point,
        clip: summarizeClipNode(queriedNode, tree ? findParentNode(tree, queriedNode.id)?.id ?? null : null, 0),
        children: (queriedNode.children ?? []).map((node) => summarizeClipNode(node, queriedNode.id, 1)),
        containing,
      }))
    }
    if (query["aria-label"] === "Arm track 1 for recording") {
'''
if anchor not in source:
    raise SystemExit("clickCustomProps arm debug anchor missing")
source = source.replace(anchor, probe, 1)
path.write_text(source)
