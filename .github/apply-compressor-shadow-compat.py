from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


# Exact upstream Knob uses this single-layer glow for its automation indicator.
# GPUIX 0.7 publishes one BoxShadow with the same offset/blur/spread/color
# contract, so preserve it exactly instead of classifying it as a limitation.
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    'const nativeCompatEntries = new Map([\n',
    '''const nativeCompatEntries = new Map([
  ["shadow-[0_0_6px_rgba(239,68,68,0.75)]", {
    base: {
      boxShadow: {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 6,
        spreadRadius: 0,
        color: "rgba(239, 68, 68, 0.75)",
      },
    },
  }],
''',
)
