from pathlib import Path

path = Path("examples/solid1-daw/src/test.tsx")
source = path.read_text()
old = '''  const overviewClipStyle = app.renderer.styleTestId("overview-clip-drums-a")
  requireCondition(
    overviewClipStyle.backgroundColor === "#00a76c",
    `arrangement overview should preserve source clip color, got ${JSON.stringify(overviewClipStyle.backgroundColor)}`,
  )
  requireCondition(app.renderer.boundsTestId("overview-clip-drums-a").width > 50, "30s source overview should retain a visible Drum Loop 01 block")'''
new = '''  const drumsOverviewPath = { fill: "#00a76c" } as const
  requireCondition(app.renderer.hasCustomProps(drumsOverviewPath), "exact ArrangementOverview should retain the Drums clip path color")
  const drumsOverviewPathData = app.renderer.customPropByCustomProps(drumsOverviewPath, "d")
  requireCondition(
    typeof drumsOverviewPathData === "string" && drumsOverviewPathData.startsWith("M") && drumsOverviewPathData.split("M").length === 3,
    `exact ArrangementOverview should combine both Drums clips into one source SVG path, got ${JSON.stringify(drumsOverviewPathData)}`,
  )'''
if old not in source:
    raise SystemExit("stale handmade overview assertion block missing")
path.write_text(source.replace(old, new, 1))
