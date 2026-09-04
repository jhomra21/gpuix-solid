from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAW = ROOT / "examples/solid1-daw"

# The upstream waveform renderer's options are optional at the API boundary.
# Our no-Canvas compatibility shim should accept the same call shape.
render_path = DAW / "src/compat/render-waveform.ts"
render = render_path.read_text()
old = "  maxHeightFraction: number\n"
new = "  maxHeightFraction?: number\n"
if old not in render:
    raise SystemExit("waveform maxHeightFraction anchor missing")
render_path.write_text(render.replace(old, new, 1))
