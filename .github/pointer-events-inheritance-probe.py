from pathlib import Path

FILES = [
    Path("packages/solid1/src/host/nodes.ts"),
    Path("packages/solid/src/host/nodes.ts"),
]

for path in FILES:
    text = path.read_text()

    old = '''  if (name === "style") {\n    node.style = createHostStyleDeclaration(node, isStyle(value) ? value : {})\n    if (node.root && node.nativeAlive) node.root.driver.enqueue("setStyle", node.id, node.style)\n    return\n  }'''
    new = '''  if (name === "style") {\n    const previousPointerEvents = node.style.pointerEvents\n    node.style = createHostStyleDeclaration(node, isStyle(value) ? value : {})\n    if (node.root && node.nativeAlive) {\n      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node))\n      if (previousPointerEvents !== node.style.pointerEvents) {\n        for (const child of node.children) refreshInheritedPointerEvents(child)\n      }\n    }\n    return\n  }'''
    if old not in text:
        raise SystemExit(f"style update block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''  const index = anchor ? parent.children.indexOf(anchor) : parent.children.length\n  parent.children.splice(index, 0, node)\n  node.parent = parent\n\n  if (!root) return'''
    new = '''  const index = anchor ? parent.children.indexOf(anchor) : parent.children.length\n  parent.children.splice(index, 0, node)\n  node.parent = parent\n\n  if (root) refreshInheritedPointerEvents(node)\n  if (!root) return'''
    if old not in text:
        raise SystemExit(f"insert block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''function createHostStyleDeclaration(node: HostElementNode, style: StyleDesc): HostStyleDeclaration {'''
    new = '''function inheritedPointerEvents(node: HostElementNode): StyleDesc["pointerEvents"] | undefined {\n  if (node.style.pointerEvents !== undefined) return node.style.pointerEvents\n  let parent = node.parent\n  while (parent?.kind === "element") {\n    if (parent.style.pointerEvents !== undefined) return parent.style.pointerEvents\n    parent = parent.parent\n  }\n  return undefined\n}\n\nfunction nativeStyleFor(node: HostElementNode): StyleDesc {\n  const pointerEvents = inheritedPointerEvents(node)\n  if (pointerEvents === undefined || node.style.pointerEvents !== undefined) return node.style\n  return { ...node.style, pointerEvents }\n}\n\nfunction refreshInheritedPointerEvents(node: HostNode): void {\n  if (node.kind === "text") return\n  if (node.root && node.nativeAlive) {\n    const style = nativeStyleFor(node)\n    if (Object.keys(style).length > 0) node.root.driver.enqueue("setStyle", node.id, style)\n  }\n  for (const child of node.children) refreshInheritedPointerEvents(child)\n}\n\nfunction createHostStyleDeclaration(node: HostElementNode, style: StyleDesc): HostStyleDeclaration {'''
    if old not in text:
        raise SystemExit(f"style declaration marker not found in {path}")
    text = text.replace(old, new, 1)

    old = '''    if (Object.keys(node.style).length > 0) {\n      root.driver.enqueue("setStyle", node.id, node.style)\n    }'''
    new = '''    const nativeStyle = nativeStyleFor(node)\n    if (Object.keys(nativeStyle).length > 0) {\n      root.driver.enqueue("setStyle", node.id, nativeStyle)\n    }'''
    if old not in text:
        raise SystemExit(f"adopt style block not found in {path}")
    text = text.replace(old, new, 1)

    path.write_text(text)
