from pathlib import Path

path = Path("examples/solid1-daw/src/test.tsx")
source = path.read_text()

show_anchor = '''  requireCondition(app.renderer.hasTestId("lane-drums-automation"), "exact source A control should expose the timeline automation lane")
'''
show_replacement = '''  const automationSvgSource = app.renderer.customPropStringContainingAll("source", [
    'stroke="#ef4444"',
    'fill="#ef4444"',
  ])
  requireCondition(
    automationSvgSource.includes('<path') && automationSvgSource.includes('<circle'),
    "exact source A control should expose the AutomationLane SVG path and points",
  )
'''
if show_anchor not in source:
    raise SystemExit("stale automation test-id show assertion missing")
source = source.replace(show_anchor, show_replacement, 1)

hide_anchor = '''  requireCondition(!app.renderer.hasTestId("lane-drums-automation"), "hiding the only source automation target should close timeline automation")
'''
hide_replacement = '''  requireCondition(
    Math.abs(app.renderer.boundsTestId("lane-drums").height - drumsLaneHeight) <= 1,
    "hiding the only source automation target should remove its 48px timeline lane",
  )
'''
if hide_anchor not in source:
    raise SystemExit("stale automation test-id hide assertion missing")
source = source.replace(hide_anchor, hide_replacement, 1)

path.write_text(source)
