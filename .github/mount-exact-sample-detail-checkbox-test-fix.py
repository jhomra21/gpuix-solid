from pathlib import Path

path = Path(__file__).resolve().parents[1] / "packages/solid/test/prop-parity.test.ts"
text = path.read_text()
anchor = '''    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "input"],
      ["setEventListener", 1, "change", true],
'''
replacement = '''    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "input"],
      ["setStyle", 1, { pointerEvents: "auto" }],
      ["setEventListener", 1, "change", true],
'''
if anchor not in text:
    raise SystemExit("checkbox mutation expectation anchor missing")
path.write_text(text.replace(anchor, replacement, 1))
