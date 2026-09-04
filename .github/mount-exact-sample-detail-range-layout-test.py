from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
test_path = ROOT / "examples/solid1-daw/src/test.tsx"
text = test_path.read_text()

old = '''  const gainInput = { type: "range", min: "-60", max: "6.02", step: "0.1" } as const
  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  app.renderer.dragCustomProps(gainInput, 20, 0)
'''
new = '''  const gainInput = { type: "range", min: "-60", max: "6.02", step: "0.1" } as const
  const gainBounds = app.renderer.boundsCustomProps(gainInput)
  const gainStyle = app.renderer.styleCustomProps(gainInput)
  requireCondition(gainBounds.width > 100 && gainBounds.height > 0, `exact Clip Gain must have intrinsic painted bounds: ${JSON.stringify(gainBounds)}`)
  requireCondition(gainBounds.x >= 0 && gainBounds.y >= 0 && gainBounds.x + gainBounds.width <= 1280 && gainBounds.y + gainBounds.height <= 900, `exact Clip Gain must remain inside the native viewport: ${JSON.stringify(gainBounds)}`)
  requireCondition(gainStyle.pointerEvents === "auto", `exact Clip Gain must own a native hit surface: ${JSON.stringify(gainStyle)}`)
  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  app.renderer.dragCustomProps(gainInput, 20, 0)
'''

if new not in text:
    if old not in text:
        raise SystemExit("exact Clip Gain verifier anchor missing")
    text = text.replace(old, new, 1)

test_path.write_text(text)
