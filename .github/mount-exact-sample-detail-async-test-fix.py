from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
test_path = ROOT / "examples/solid1-daw/src/test.tsx"
text = test_path.read_text()

old = '''  app.renderer.clickText("Analyze")
  await Promise.resolve()
  app.renderer.flush()
'''
new = '''  app.renderer.clickText("Analyze")
  // The pinned source intentionally chains ensureClipBuffer -> analyzeClip ->
  // async analysis -> autoApply. Drain that deterministic promise chain before
  // asserting the final applied state; one microtask only observes an
  // intermediate state and races the exact source behavior.
  for (let turn = 0; turn < 6; turn++) await Promise.resolve()
  app.renderer.flush()
'''

if new not in text:
    if old not in text:
        raise SystemExit("Sample Detail Analyze verifier timing anchor missing")
    text = text.replace(old, new, 1)

test_path.write_text(text)
