from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
text = path.read_text()

late = '''installDomEventEnvironment()
const resizeElement = document.createElement("div")
'''
early_anchor = '''const selectorRoot = createHostElement("div", "section")
'''

if late not in text:
    raise SystemExit("late DOM environment install anchor missing")
if early_anchor not in text:
    raise SystemExit("selector setup anchor missing")

text = text.replace(late, '''const resizeElement = document.createElement("div")
''', 1)
text = text.replace(early_anchor, '''installDomEventEnvironment()

const selectorRoot = createHostElement("div", "section")
''', 1)
path.write_text(text)
