from pathlib import Path
import json

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

# Typecheck the local Solid1 host directly from source. Runtime/Vite still use the
# package dependency; this only removes an incidental node_modules link dependency
# from the isolated source-closure typecheck.
tsconfig_path = DAW / "tsconfig.json"
tsconfig = json.loads(tsconfig_path.read_text())
paths = tsconfig["compilerOptions"]["paths"]
paths["@jhomra21/gpuix-solid1"] = ["../../packages/solid1/src/index.ts"]
paths["@jhomra21/gpuix-solid1/jsx-runtime"] = ["../../packages/solid1/jsx-runtime.d.ts"]
paths["@jhomra21/gpuix-solid1/jsx-dev-runtime"] = ["../../packages/solid1/jsx-dev-runtime.d.ts"]
tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + "\n")
