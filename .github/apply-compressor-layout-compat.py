from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Source transitions/rotation have no GPUIX 0.7 animation/transform equivalent.
# Keep these omissions candidate-specific so unrelated unsupported CSS still fails.
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    'const explicitlyIgnored = new Map([\n',
    '''const explicitlyIgnored = new Map([
  ["duration-100", "GPUIX 0.7 does not publish CSS transition timing; native state changes remain immediate"],
  ["duration-150", "GPUIX 0.7 does not publish CSS transition timing; native state changes remain immediate"],
  ["transition-transform", "GPUIX 0.7 does not publish CSS transitions; source transform transitions remain immediate"],
  ["rotate-180", "GPUIX 0.7 StyleDesc has no general CSS transform; exact collapsed-device rotation remains source-locked but cannot be reproduced natively"],
''',
)

# Native descendant manifests already express source-owned child layout. Extend
# the Solid1 host used by this fixture with CSS-like direct positional selectors
# so nonuniform grids can stay in exact upstream markup. Solid2 receives the
# equivalent reviewed mirror after this source closure is certified.
replace_once(
    "packages/solid1/src/native-style.ts",
    '''  tagName: string,
  directChild: boolean,
): StyleDesc | undefined {''',
    '''  tagName: string,
  directChild: boolean,
  directChildIndex?: number,
): StyleDesc | undefined {''',
)
replace_once(
    "packages/solid1/src/native-style.ts",
    '''    if (directChild) {
      resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>${tagName}`]))
    }
''',
    '''    if (directChild) {
      resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>${tagName}`]))
      if (directChildIndex !== undefined) {
        resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>:nth-child(${directChildIndex})`]))
        resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>${tagName}:nth-child(${directChildIndex})`]))
      }
    }
''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '''  const tagName = semanticTags.get(node) ?? node.type
  const directParent = node.parent
  let resolved: StyleDesc | undefined
''',
    '''  const tagName = semanticTags.get(node) ?? node.type
  const directParent = node.parent
  const directChildIndex = directParent?.kind === "element"
    ? directParent.children.filter((child) => child.kind === "element").indexOf(node) + 1
    : undefined
  let resolved: StyleDesc | undefined
''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '''        tagName,
        directParent === ancestor,
      ),''',
    '''        tagName,
        directParent === ancestor,
        directParent === ancestor ? directChildIndex : undefined,
      ),''',
)

# Exact Compressor grid contracts. Equal-column grids map directly. Nonuniform
# templates use flex plus positional descendant widths, preserving 84/1fr/96
# and auto/1fr without changing the source component.
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    '''  ["grid-cols-2", { base: { gridTemplateColumns: 2 } }],
''',
    '''  ["grid-cols-2", { base: { gridTemplateColumns: 2 } }],
  ["grid-cols-3", { base: { gridTemplateColumns: 3 } }],
  ["grid-cols-4", { base: { gridTemplateColumns: 4 } }],
  ["grid-cols-[84px_1fr_96px]", {
    base: { display: "flex", flexDirection: "row" },
    descendants: {
      ">:nth-child(1)": { base: { width: 84, minWidth: 84, flexGrow: 0, flexShrink: 0 } },
      ">:nth-child(2)": { base: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0 } },
      ">:nth-child(3)": { base: { width: 96, minWidth: 96, flexGrow: 0, flexShrink: 0 } },
    },
  }],
  ["grid-cols-[auto_1fr]", {
    base: { display: "flex", flexDirection: "row" },
    descendants: {
      ">:nth-child(1)": { base: { flexGrow: 0, flexShrink: 0 } },
      ">:nth-child(2)": { base: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0 } },
    },
  }],
''',
)
