from pathlib import Path

path = Path(".github/source-sidebar-verifier-apply.py")
source = path.read_text()
old = 'mixer_end = test.index("  for (const testId of [", mixer_start)'
new = 'mixer_end = test.index(\'  for (const testId of [\\n    "Hide browser sidebar"\', mixer_start)'
if old in source:
    path.write_text(source.replace(old, new, 1))
elif new not in source:
    raise SystemExit("mixer end probe anchor missing")

path = Path("examples/solid1-daw/src/test.tsx")
source = path.read_text()
anchor = '  requireCondition(returnTimeline.y >= timelineFooter.y, "Return timeline row should live inside the sticky footer")'
if anchor not in source:
    raise SystemExit(0)
probe = '''  console.log("source sidebar geometry probe", JSON.stringify({
    timelineFooter,
    returnTimeline,
    returnAncestors: app.renderer.ancestorBoundsCustomProps(returnTrack),
    returnSidebar,
    masterTimeline,
    masterAncestors: app.renderer.ancestorBoundsCustomProps(masterEffects),
    masterSidebar,
  }))
'''
if "source sidebar geometry probe" not in source:
    path.write_text(source.replace(anchor, probe + anchor, 1))
