from pathlib import Path

path = Path("examples/solid1-daw/src/test.tsx")
source = path.read_text()

old = '''  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  app.renderer.clickCenterTestId("clip-drums-a")
  requireCondition(app.renderer.hasTestId("effects-panel") && !app.renderer.hasTestId("clip-panel"), "first audio-clip tap should select without opening Sample Detail")
  app.renderer.clickCenterTestId("clip-drums-a")
'''
new = '''  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  const drumsAudioClip = { title: "Drum Loop 01" } as const
  requireCondition(app.renderer.hasCustomProps(drumsAudioClip), "exact ClipComponent should expose the source clip title")
  app.renderer.clickCustomProps(drumsAudioClip)
  requireCondition(app.renderer.hasTestId("effects-panel") && !app.renderer.hasTestId("clip-panel"), "first exact audio-clip tap should select without opening Sample Detail")
  requireCondition(app.renderer.hasCustomProps(drumsAudioClip), "selected exact ClipComponent should remain addressable by its source title")
  app.renderer.clickCustomProps(drumsAudioClip)
'''
if old not in source:
    raise SystemExit("stale clip-drums-a interaction block missing")
path.write_text(source.replace(old, new, 1))
