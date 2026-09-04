from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
text = path.read_text()

old = '''resizeObserver.observe(resizeElement)
resizeObserver.disconnect()
if (resizeHeight === undefined) throw new Error("native ResizeObserver must report initial host bounds")
'''
new = '''resizeObserver.observe(resizeElement)
await new Promise((resolve) => setTimeout(resolve, 24))
resizeObserver.disconnect()
if (resizeHeight === undefined) throw new Error("native ResizeObserver must report initial host bounds")
'''
if old not in text:
    raise SystemExit("synchronous ResizeObserver parity anchor missing")
path.write_text(text.replace(old, new, 1))
