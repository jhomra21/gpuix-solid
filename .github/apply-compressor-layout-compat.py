from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Source transitions/rotation/focus-ring paint have no exact GPUIX 0.7
# equivalent. Keep these omissions candidate-specific so unrelated unsupported
# CSS still fails instead of silently broadening the compatibility surface.
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    'const explicitlyIgnored = new Map([\n',
    '''const explicitlyIgnored = new Map([
  ["duration-100", "GPUIX 0.7 does not publish CSS transition timing; native state changes remain immediate"],
  ["duration-150", "GPUIX 0.7 does not publish CSS transition timing; native state changes remain immediate"],
  ["transition-transform", "GPUIX 0.7 does not publish CSS transitions; source transform transitions remain immediate"],
  ["rotate-180", "GPUIX 0.7 StyleDesc has no general CSS transform; exact collapsed-device rotation remains source-locked but cannot be reproduced natively"],
  ["focus-visible:ring-1", "GPUIX 0.7 does not publish browser focus-visible ring painting through StyleDesc; keyboard focus semantics remain native"],
  ["focus-visible:ring-inset", "GPUIX 0.7 BoxShadow has no inset focus-ring mode; the exact source utility remains source-locked"],
  ["focus-visible:ring-cyan-300/70", "GPUIX 0.7 does not publish browser focus-visible ring color through StyleDesc; keyboard focus semantics remain native"],
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

# Change-detector for the generic positional descendant feature. The exact
# Compressor markup keeps three div children; native compatibility must resolve
# them to the source 84px / flexible / 96px contract without wrapper JSX.
replace_once(
    "examples/solid1-daw/src/test.tsx",
    '''  requireCondition(!rootText().includes("Drop files here to create a new track"), "fixture must not invent the new-track drop row")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
''',
    '''  requireCondition(!rootText().includes("Drop files here to create a new track"), "fixture must not invent the new-track drop row")

  const compressorColumnLeft = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 1)
  const compressorColumnMiddle = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 2)
  const compressorColumnRight = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 3)
  requireCondition(compressorColumnLeft?.width === 84 && compressorColumnLeft.minWidth === 84, "positional descendant compatibility should preserve the source 84px Compressor left column")
  requireCondition(compressorColumnMiddle?.flexGrow === 1 && compressorColumnMiddle.flexBasis === 0 && compressorColumnMiddle.minWidth === 0, "positional descendant compatibility should preserve the source flexible Compressor middle column")
  requireCondition(compressorColumnRight?.width === 96 && compressorColumnRight.minWidth === 96, "positional descendant compatibility should preserve the source 96px Compressor right column")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
''',
)

# The fixture exposes only the real Volume automation target. Once that target
# is visible, exact TrackSidebarRow disables Add automation. The old verifier
# encoded the removed fake second lane; guard the source-correct no-op instead.
replace_once(
    "examples/solid1-daw/src/test.tsx",
    '''  app.renderer.clickCenterTestId("track-synth-automation-add")
  const twoAutomationLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const twoAutomationSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(twoAutomationLaneHeight - oneAutomationLaneHeight - 48) <= 1, "adding automation should add exactly one 48px lane")
  requireCondition(Math.abs(twoAutomationLaneHeight - twoAutomationSidebarHeight) <= 1, "multiple automation lanes should keep timeline and mixer geometry aligned")

  app.renderer.scrollTestId("track-sidebar-scrolling", 0, -260)
  const visibleAutomationHide = app.renderer.boundsTestId("track-synth-automation-hide")
  requireCondition(
    visibleAutomationHide.y >= sidebarScrolling.y && bottom(visibleAutomationHide) <= bottom(sidebarScrolling),
    `Synth automation hide should be visible before interaction, control ${JSON.stringify(visibleAutomationHide)}, mixer ${JSON.stringify(sidebarScrolling)}`,
  )
  app.renderer.clickCenterTestId("track-synth-automation-hide")
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-synth").height - oneAutomationLaneHeight) <= 1, "hiding one automation lane should remove exactly 48px")
  app.renderer.clickCenterTestId("track-synth-automation-hide")
  requireCondition(!app.renderer.hasTestId("lane-synth-automation"), "hiding the final automation lane should close timeline automation")
  requireCondition(!app.renderer.hasTestId("track-synth-automation-lanes"), "hiding the final automation lane should close mixer automation")
''',
    '''  app.renderer.clickCenterTestId("track-synth-automation-add")
  const afterUnavailableAutomationAddLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const afterUnavailableAutomationAddSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(afterUnavailableAutomationAddLaneHeight - oneAutomationLaneHeight) <= 1, "Add automation must not invent a second lane when Volume is the only source parameter")
  requireCondition(Math.abs(afterUnavailableAutomationAddSidebarHeight - oneAutomationSidebarHeight) <= 1, "disabled Add automation must not change mixer geometry")

  app.renderer.scrollTestId("track-sidebar-scrolling", 0, -260)
  const visibleAutomationHide = app.renderer.boundsTestId("track-synth-automation-hide")
  requireCondition(
    visibleAutomationHide.y >= sidebarScrolling.y && bottom(visibleAutomationHide) <= bottom(sidebarScrolling),
    `Synth automation hide should be visible before interaction, control ${JSON.stringify(visibleAutomationHide)}, mixer ${JSON.stringify(sidebarScrolling)}`,
  )
  app.renderer.clickCenterTestId("track-synth-automation-hide")
  requireCondition(!app.renderer.hasTestId("lane-synth-automation"), "hiding the only source automation target should close timeline automation")
  requireCondition(!app.renderer.hasTestId("track-synth-automation-lanes"), "hiding the only source automation target should close mixer automation")
''',
)
