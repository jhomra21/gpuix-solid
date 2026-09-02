from pathlib import Path

path = Path("examples/solid1-daw/scripts/generate-native-tailwind.mjs")
text = path.read_text()
anchor = "const explicitlyIgnored = new Map([\n"
omissions = [
    ("duration-75", "native StyleDesc transitions are not published in GPUIX 0.7"),
    ("transition-all", "native StyleDesc transitions are not published in GPUIX 0.7"),
    ("transition-opacity", "native StyleDesc transitions are not published in GPUIX 0.7"),
    ("focus-visible:outline", "GPUIX 0.7 does not publish browser focus-outline painting through StyleDesc"),
    ("focus-visible:outline-2", "GPUIX 0.7 does not publish browser focus-outline width through StyleDesc"),
    ("focus-visible:outline-offset-[-2px]", "GPUIX 0.7 does not publish browser focus-outline offset through StyleDesc"),
    ("focus-visible:outline-primary", "GPUIX 0.7 does not publish browser focus-outline color through StyleDesc"),
    ("focus:ring-2", "GPUIX 0.7 does not publish browser focus-ring painting through StyleDesc"),
    ("focus:ring-ring", "GPUIX 0.7 does not publish browser focus-ring color through StyleDesc"),
    ("focus:ring-offset-2", "GPUIX 0.7 does not publish browser focus-ring offset through StyleDesc"),
]
for candidate, reason in reversed(omissions):
    line = f'  ["{candidate}", "{reason}"],\n'
    if line in text:
        continue
    if anchor not in text:
        raise SystemExit("explicit omission anchor missing")
    text = text.replace(anchor, anchor + line, 1)
path.write_text(text)
