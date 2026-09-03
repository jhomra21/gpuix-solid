from pathlib import Path

for file_name in ["packages/solid1/src/host/nodes.ts", "packages/solid/src/host/nodes.ts"]:
    path = Path(file_name)
    source = path.read_text()

    replace_anchor = '''export function replaceHostText(node: HostTextNode, value: string): void {
  const text = String(value)
  if (node.text === text) return
  node.text = text
  if (node.root && node.nativeAlive) node.root.driver.enqueue("setText", node.id, text)
}
'''
    replace_text = '''export function replaceHostText(node: HostTextNode, value: string): void {
  const text = String(value)
  if (node.text === text) return
  const layoutChanged = (node.text.length === 0) !== (text.length === 0)
  node.text = text
  if (!node.root || !node.nativeAlive) return
  node.root.driver.enqueue("setText", node.id, text)
  if (layoutChanged) node.root.driver.enqueue("setStyle", node.id, nativeTextLayoutStyle(text))
}
'''
    if replace_anchor not in source:
        raise SystemExit(f"replaceHostText anchor missing in {file_name}")
    source = source.replace(replace_anchor, replace_text, 1)

    adopt_anchor = '''  if (node.kind === "text") {
    root.driver.enqueue("setText", node.id, node.text)
  } else {
'''
    adopt_text = '''  if (node.kind === "text") {
    root.driver.enqueue("setText", node.id, node.text)
    if (node.text.length === 0) root.driver.enqueue("setStyle", node.id, nativeTextLayoutStyle(node.text))
  } else {
'''
    if adopt_anchor not in source:
        raise SystemExit(f"text adoption anchor missing in {file_name}")
    source = source.replace(adopt_anchor, adopt_text, 1)

    helper_anchor = '''function dataAttributeProperty(name: string): string {
'''
    helper_text = '''function nativeTextLayoutStyle(text: string): StyleDesc {
  return text.length === 0
    ? {
        display: "none",
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        maxWidth: 0,
        maxHeight: 0,
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 0,
      }
    : {}
}

function dataAttributeProperty(name: string): string {
'''
    if helper_anchor not in source:
        raise SystemExit(f"text layout helper anchor missing in {file_name}")
    source = source.replace(helper_anchor, helper_text, 1)

    path.write_text(source)
