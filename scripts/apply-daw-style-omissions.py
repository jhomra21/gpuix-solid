from pathlib import Path

path = Path("examples/solid1-daw/scripts/generate-native-tailwind.mjs")
text = path.read_text()
anchor = "const explicitlyIgnored = new Map([\n"
omissions = [
    ("duration-75", "native StyleDesc transitions are not published in GPUIX 0.7"),
    ("transition-all", "native StyleDesc transitions are not published in GPUIX 0.7"),
]
for candidate, reason in reversed(omissions):
    line = f'  ["{candidate}", "{reason}"],\n'
    if line in text:
        continue
    if anchor not in text:
        raise SystemExit("explicit omission anchor missing")
    text = text.replace(anchor, anchor + line, 1)
path.write_text(text)
