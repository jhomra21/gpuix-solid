from pathlib import Path


testing_path = Path("packages/solid1/src/testing.ts")
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
function findCustomPropStringContainingAll(
  node: NativeTreeNode | null,
  name: string,
  fragments: readonly string[],
): string | undefined {
  if (!node) return undefined
  const value = node.customProps?.[name]
  if (typeof value === "string" && fragments.every((fragment) => value.includes(fragment))) return value
  for (const child of node.children ?? []) {
    const found = findCustomPropStringContainingAll(child, name, fragments)
    if (found !== undefined) return found
  }
  return undefined
}
'''
if helper_anchor not in testing:
    raise SystemExit("custom-prop tree helper anchor missing")
testing = testing.replace(helper_anchor, helper_replacement, 1)

method_anchor = '''  hasCustomProps(query: TestCustomPropQuery): boolean {
    return findNodeByCustomProps(parseTree(this.#native.getTreeJson()), query) !== undefined
  }
'''
method_replacement = method_anchor + '''
  customPropStringContainingAll(name: string, fragments: readonly string[]): string {
    this.#native.flush()
    const value = findCustomPropStringContainingAll(parseTree(this.#native.getTreeJson()), name, fragments)
    if (value === undefined) {
      throw new Error(`Expected string custom prop ${JSON.stringify(name)} containing ${JSON.stringify(fragments)}`)
    }
    return value
  }
'''
if method_anchor not in testing:
    raise SystemExit("custom-prop renderer method anchor missing")
testing_path.write_text(testing.replace(method_anchor, method_replacement, 1))


test_path = Path("examples/solid1-daw/src/test.tsx")
source = test_path.read_text()
old = '''  const overviewClipStyle = app.renderer.styleTestId("overview-clip-drums-a")
  requireCondition(
    overviewClipStyle.backgroundColor === "#00a76c",
    `arrangement overview should preserve source clip color, got ${JSON.stringify(overviewClipStyle.backgroundColor)}`,
  )
  requireCondition(app.renderer.boundsTestId("overview-clip-drums-a").width > 50, "30s source overview should retain a visible Drum Loop 01 block")'''
new = '''  const overviewSvgSource = app.renderer.customPropStringContainingAll("source", [
    'viewBox="0 0 100 40"',
    'fill="#00a76c"',
  ])
  const drumsOverviewPathMarkup = overviewSvgSource.match(/<path[^>]*fill="#00a76c"[^>]*>/)?.[0]
  const drumsOverviewPathData = drumsOverviewPathMarkup?.match(/\\bd="([^"]+)"/)?.[1]
  requireCondition(
    drumsOverviewPathData?.startsWith("M") === true && drumsOverviewPathData.split("M").length === 3,
    `exact ArrangementOverview should combine both Drums clips into one source SVG path, got ${JSON.stringify(drumsOverviewPathData)}`,
  )'''
if old not in source:
    raise SystemExit("stale handmade overview assertion block missing")
test_path.write_text(source.replace(old, new, 1))
