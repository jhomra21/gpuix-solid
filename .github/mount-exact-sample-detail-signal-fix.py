from pathlib import Path

path = Path(__file__).resolve().parents[1] / "examples/solid1-daw/src/native/Timeline.tsx"
text = path.read_text()
old = "  const [bottomPanelHeight, setBottomPanelHeight] = createSignal(layout.bottomPanelHeight)\n"
new = "  const [bottomPanelHeight, setBottomPanelHeight] = createSignal<number>(layout.bottomPanelHeight)\n"
if text.count(old) != 1:
    raise SystemExit("bottom panel height signal anchor changed")
path.write_text(text.replace(old, new, 1))
