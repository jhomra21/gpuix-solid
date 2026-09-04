from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
test_path = ROOT / "examples/solid1-daw/src/test.tsx"
test = test_path.read_text()

old = '''  app.renderer.clickText("HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "exact Sample Detail footer Hide should close the shared panel")
'''
new = '''  app.renderer.scrollTestId("daw-test-viewport", -320, -260)
  const exactHideBounds = app.renderer.boundsText("HIDE")
  requireCondition(
    exactHideBounds.x >= 0 && right(exactHideBounds) <= viewportWidth,
    `exact Sample Detail HIDE should be visible before interaction, got ${JSON.stringify(exactHideBounds)}`,
  )
  app.renderer.clickText("HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "exact Sample Detail footer Hide should close the shared panel")
  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
'''
if new not in test:
    if old not in test:
        raise SystemExit("exact Sample Detail footer visibility anchor missing")
    test = test.replace(old, new, 1)

test_path.write_text(test)
