from pathlib import Path

path = Path("examples/solid1-daw/scripts/generate-native-tailwind.mjs")
text = path.read_text()
compat_anchor = "const nativeCompatEntries = new Map([\n"
compat_lines = [
    '  ["grid-cols-2", { base: { gridTemplateColumns: 2 } }],\n',
    '  ["max-h-screen", { base: { maxHeight: "100%" } }],\n',
    '  ["ring-1", { base: { boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 0, spreadRadius: 1, color: "rgba(0, 0, 0, 0)" } } }],\n',
    '  ["ring-blue-400/80", { base: { boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 0, spreadRadius: 1, color: "rgba(81, 162, 255, 0.8)" } } }],\n',
]
for compat_line in reversed(compat_lines):
    if compat_line in text:
        continue
    if compat_anchor not in text:
        raise SystemExit("native compatibility anchor missing")
    text = text.replace(compat_anchor, compat_anchor + compat_line, 1)

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
    ("hover:brightness-110", "GPUIX 0.7 does not publish CSS filter effects; this is only hover feedback on unselected clips and does not alter clip geometry or state"),
    ("shadow-background/40", "this only recolors the copied context menu's layered shadow-md; GPUIX 0.7 exposes one BoxShadow and cannot represent Tailwind's layered shadow-md geometry"),
]
for candidate, reason in reversed(omissions):
    line = f'  ["{candidate}", "{reason}"],\n'
    if line in text:
        continue
    if anchor not in text:
        raise SystemExit("explicit omission anchor missing")
    text = text.replace(anchor, anchor + line, 1)
path.write_text(text)
