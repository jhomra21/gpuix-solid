from pathlib import Path

path = Path(__file__).resolve().parents[1] / "examples/solid1-daw/src/test.tsx"
text = path.read_text()

replacements = {
    '  requireText(rootText(), "Sample Detail", "exact Sample Detail rail")\n':
        '  requireText(rootText(), "SAMPLE DETAIL", "exact Sample Detail rail")\n',
    '  requireText(rootText(), "Beat Grid", "exact SampleDetailWaveform header")\n':
        '  requireText(rootText(), "BEAT GRID", "exact SampleDetailWaveform header")\n',
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"Sample Detail label assertion anchor missing: {old.strip()}")
    text = text.replace(old, new, 1)

path.write_text(text)
