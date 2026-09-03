from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:160]!r}")
    write(path, text.replace(old, new, 1))


def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    text = read(path)
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"start anchor missing in {path}: {start[:160]!r}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"end anchor missing in {path}: {end[:160]!r}")
    write(path, text[:start_index] + replacement + text[end_index:])


# Browser accessibility metadata and the semantic hidden attribute are useful
# on native built-ins too. Keep the host mirror identical across Solid 1/2.
for path in [
    "packages/solid1/src/host/nodes.ts",
    "packages/solid/src/host/nodes.ts",
]:
    replace_once(
        path,
        'const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId", "highlight", "title"])\n',
        'const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId", "highlight", "title"])\n\nfunction isForwardedBuiltInProp(name: string): boolean {\n  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" || name.startsWith("aria-")\n}\n',
    )
    text = read(path)
    old = 'if (BUILT_IN_TYPES.has(node.type) && !UNIVERSAL_PROPS.has(name)) continue'
    if text.count(old) != 1:
        raise SystemExit(f"expected one adopt built-in prop filter in {path}, got {text.count(old)}")
    text = text.replace(old, 'if (BUILT_IN_TYPES.has(node.type) && !isForwardedBuiltInProp(name)) continue')
    old = 'if (BUILT_IN_TYPES.has(node.type) && !UNIVERSAL_PROPS.has(name)) return'
    if text.count(old) != 1:
        raise SystemExit(f"expected one live built-in prop filter in {path}, got {text.count(old)}")
    text = text.replace(old, 'if (BUILT_IN_TYPES.has(node.type) && !isForwardedBuiltInProp(name)) return')
    write(path, text)

# Solid 1: retain hidden as a DOM-like prop and overlay display:none in native
# style resolution. This preserves exact source semantics without editing the
# copied EffectShell.
replace_once(
    "packages/solid1/src/universal.ts",
    '''interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
}
''',
    '''interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
  hidden: boolean
}
''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '''      if (name === "classList") {
        setNativeClassList(node, parseNativeClassList(value))
        refreshInlineSvg(node)
        return
      }
    }
    setHostProperty(node, name, value, previous)
''',
    '''      if (name === "classList") {
        setNativeClassList(node, parseNativeClassList(value))
        refreshInlineSvg(node)
        return
      }
      if (name === "hidden") {
        setHostProperty(node, name, value, previous)
        setNativeHidden(node, Boolean(value))
        return
      }
    }
    setHostProperty(node, name, value, previous)
''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '''    classList: undefined,
    inlineStyle: undefined,
  }
}
''',
    '''    classList: undefined,
    inlineStyle: undefined,
    hidden: false,
  }
}
''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '''function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function commitNativeStyleState''',
    '''function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function setNativeHidden(node: HostElementNode, hidden: boolean): void {
  const state = nativeStyleState(node)
  state.hidden = hidden
  commitNativeStyleState(node, state)
}

function commitNativeStyleState''',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle)\n',
    '  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined\n  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle, hiddenStyle)\n',
)

# Solid 2 mirrors the same semantic hidden behavior in its host architecture.
replace_once(
    "packages/solid/src/host/universal.ts",
    '''interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
}
''',
    '''interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
  hidden: boolean
}
''',
)
replace_once(
    "packages/solid/src/host/universal.ts",
    '''  if (name === "classList") {
    setNativeClassList(node, parseNativeClassList(value))
    return
  }
  setHostProperty(node, name, value, previous)
}
''',
    '''  if (name === "classList") {
    setNativeClassList(node, parseNativeClassList(value))
    return
  }
  if (name === "hidden") {
    setHostProperty(node, name, value, previous)
    setNativeHidden(node, Boolean(value))
    return
  }
  setHostProperty(node, name, value, previous)
}
''',
)
replace_once(
    "packages/solid/src/host/universal.ts",
    '  return styleStates.get(node) ?? { class: undefined, className: undefined, classList: undefined, inlineStyle: undefined }\n',
    '  return styleStates.get(node) ?? { class: undefined, className: undefined, classList: undefined, inlineStyle: undefined, hidden: false }\n',
)
replace_once(
    "packages/solid/src/host/universal.ts",
    '''function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function commitNativeStyleState''',
    '''function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function setNativeHidden(node: HostElementNode, hidden: boolean): void {
  const state = nativeStyleState(node)
  state.hidden = hidden
  commitNativeStyleState(node, state)
}

function commitNativeStyleState''',
)
replace_once(
    "packages/solid/src/host/universal.ts",
    '  const resolvedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle)\n',
    '  const hiddenStyle: StyleDesc | undefined = state.hidden ? { display: "none" } : undefined\n  const resolvedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle, hiddenStyle)\n',
)

# Let native tests locate exact copied controls by accessibility metadata instead
# of adding fixture-only test IDs to upstream source.
testing_path = "packages/solid1/src/testing.ts"
replace_once(
    testing_path,
    '''interface NativeTreeNode {
  id: number
  type: string
  testId?: string
  style?: StyleDesc
  text?: string | null
  customProps?: Record<string, MutationValue>
  children?: NativeTreeNode[]
}
''',
    '''interface NativeTreeNode {
  id: number
  type: string
  testId?: string
  style?: StyleDesc
  text?: string | null
  customProps?: Record<string, MutationValue>
  children?: NativeTreeNode[]
}

type TestCustomPropQuery = Readonly<Record<string, string | number | boolean | null>>
''',
)
replace_once(
    testing_path,
    '''function findNode(node: NativeTreeNode | null, testId: string): NativeTreeNode | undefined {
  if (!node) return undefined
  if (node.testId === testId) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, testId)
    if (found) return found
  }
  return undefined
}

function findFirstNodeOfType''',
    '''function findNode(node: NativeTreeNode | null, testId: string): NativeTreeNode | undefined {
  if (!node) return undefined
  if (node.testId === testId) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, testId)
    if (found) return found
  }
  return undefined
}

function matchesCustomProps(node: NativeTreeNode, query: TestCustomPropQuery): boolean {
  for (const [key, expected] of Object.entries(query)) {
    if (node.customProps?.[key] !== expected) return false
  }
  return true
}

function findNodeByCustomProps(node: NativeTreeNode | null, query: TestCustomPropQuery): NativeTreeNode | undefined {
  if (!node) return undefined
  if (matchesCustomProps(node, query)) return node
  for (const child of node.children ?? []) {
    const found = findNodeByCustomProps(child, query)
    if (found) return found
  }
  return undefined
}

function findFirstNodeOfType''',
)
replace_once(
    testing_path,
    '''  hasTestId(testId: string): boolean {
    return findNode(parseTree(this.#native.getTreeJson()), testId) !== undefined
  }

  textContent(testId: string): string {
''',
    '''  hasTestId(testId: string): boolean {
    return findNode(parseTree(this.#native.getTreeJson()), testId) !== undefined
  }

  hasCustomProps(query: TestCustomPropQuery): boolean {
    return findNodeByCustomProps(parseTree(this.#native.getTreeJson()), query) !== undefined
  }

  clickCustomProps(query: TestCustomPropQuery): void {
    const point = insetPoint(this.boundsNode(this.requireCustomProps(query), `custom props ${JSON.stringify(query)}`))
    this.#native.simulateClick(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  pressKeyCustomProps(query: TestCustomPropQuery, key: string): void {
    const node = this.requireCustomProps(query)
    this.#native.focusElement(node.id)
    this.pressKey(key)
  }

  customPropByCustomProps(query: TestCustomPropQuery, key: string): MutationValue | undefined {
    return this.requireCustomProps(query).customProps?.[key]
  }

  styleCustomPropsWithinTestId(testId: string, query: TestCustomPropQuery): StyleDesc {
    const parent = this.requireTestId(testId)
    const node = findNodeByCustomProps(parent, query)
    if (!node) throw new Error(`Expected custom props ${JSON.stringify(query)} inside ${testId}`)
    return node.style ?? {}
  }

  textContent(testId: string): string {
''',
)
replace_once(
    testing_path,
    '''  private requireTestId(testId: string): NativeTreeNode {
    const node = findNode(parseTree(this.#native.getTreeJson()), testId)
    if (!node) throw new Error(`Expected ${testId} in native tree`)
    return node
  }
}
''',
    '''  private requireCustomProps(query: TestCustomPropQuery): NativeTreeNode {
    const node = findNodeByCustomProps(parseTree(this.#native.getTreeJson()), query)
    if (!node) throw new Error(`Expected custom props ${JSON.stringify(query)} in native tree`)
    return node
  }

  private requireTestId(testId: string): NativeTreeNode {
    const node = findNode(parseTree(this.#native.getTreeJson()), testId)
    if (!node) throw new Error(`Expected ${testId} in native tree`)
    return node
  }
}
''',
)

# Replace only the handmade Compressor card. The EQ fixture remains as-is until
# its own exact-source closure is audited.
effects_path = "examples/solid1-daw/src/native/EffectsPanel.tsx"
replace_once(
    effects_path,
    'import type { EqBandParams, EqBandType } from "@daw-browser/shared"\n',
    'import { createDefaultCompressorParams, type CompressorParams, type EqBandParams, type EqBandType } from "@daw-browser/shared"\n',
)
replace_once(
    effects_path,
    'import EqFilterTypeSelect from "~/components/effects/eq-filter-type-select"\n',
    'import Compressor from "~/components/effects/Compressor"\nimport EqFilterTypeSelect from "~/components/effects/eq-filter-type-select"\nimport { DeviceCollapseProvider, safeDeviceContentId } from "~/components/timeline/create-effects-panel-device-collapse"\n',
)
replace_between(
    effects_path,
    'function ToggleButton(props:',
    'export interface EffectsPanelProps',
    '',
)
replace_once(
    effects_path,
    'const signedDb = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`\n',
    'const signedDb = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`\nconst COMPRESSOR_DEFAULTS = createDefaultCompressorParams()\n',
)
replace_once(
    effects_path,
    '''  const [compressorAutoRelease, setCompressorAutoRelease] = createSignal(false)
  const [compressorKnee, setCompressorKnee] = createSignal(6)
  const [compressorLookahead, setCompressorLookahead] = createSignal(0)
  const [compressorMakeup, setCompressorMakeup] = createSignal(0)
  const [compressorDetector, setCompressorDetector] = createSignal<"PEAK" | "RMS">("PEAK")
  const [compressorDynamics, setCompressorDynamics] = createSignal<"Compress" | "Expand">("Compress")
  const [compressorEnvelope, setCompressorEnvelope] = createSignal<"Log" | "Linear">("Log")
  const [compressorView, setCompressorView] = createSignal<"Transfer" | "GR" | "Output">("Transfer")
''',
    '''  const [compressorAutoRelease, setCompressorAutoRelease] = createSignal(COMPRESSOR_DEFAULTS.autoRelease)
  const [compressorKnee, setCompressorKnee] = createSignal(COMPRESSOR_DEFAULTS.kneeDb)
  const [compressorLookahead, setCompressorLookahead] = createSignal(COMPRESSOR_DEFAULTS.lookaheadMs)
  const [compressorMakeup, setCompressorMakeup] = createSignal(COMPRESSOR_DEFAULTS.makeupDb)
  const [compressorDetector, setCompressorDetector] = createSignal(COMPRESSOR_DEFAULTS.detectorMode)
  const [compressorDynamics, setCompressorDynamics] = createSignal(COMPRESSOR_DEFAULTS.dynamicsMode)
  const [compressorEnvelope, setCompressorEnvelope] = createSignal(COMPRESSOR_DEFAULTS.envelopeCurve)
  const [compressorCollapsed, setCompressorCollapsed] = createSignal(false)
''',
)
replace_once(
    effects_path,
    '''  const setSelectedQ = (value: number): void => {
    const index = eqSelectedBand()
    setEqQ((current) => current.map((q, entry) => entry === index ? clamp(value, 0.1, 18) : q))
  }

  const resetCompressor = (): void => {
''',
    '''  const setSelectedQ = (value: number): void => {
    const index = eqSelectedBand()
    setEqQ((current) => current.map((q, entry) => entry === index ? clamp(value, 0.1, 18) : q))
  }

  const compressorParams = (): CompressorParams => ({
    enabled: props.compressorEnabled,
    thresholdDb: props.compressorThreshold,
    ratio: props.compressorRatio,
    attackMs: props.compressorAttack,
    releaseMs: props.compressorRelease,
    autoRelease: compressorAutoRelease(),
    makeupDb: compressorMakeup(),
    outputDb: COMPRESSOR_DEFAULTS.outputDb,
    dryWet: props.compressorWet,
    kneeDb: compressorKnee(),
    lookaheadMs: compressorLookahead(),
    detectorMode: compressorDetector(),
    dynamicsMode: compressorDynamics(),
    envelopeCurve: compressorEnvelope(),
    sidechain: COMPRESSOR_DEFAULTS.sidechain,
  })

  const updateCompressor = (updates: Partial<CompressorParams>): void => {
    if (updates.enabled !== undefined && updates.enabled !== props.compressorEnabled) props.onToggleCompressor()
    if (updates.thresholdDb !== undefined) props.onThresholdChange(updates.thresholdDb)
    if (updates.ratio !== undefined) props.onRatioChange(updates.ratio)
    if (updates.attackMs !== undefined) props.onAttackChange(updates.attackMs)
    if (updates.releaseMs !== undefined) props.onReleaseChange(updates.releaseMs)
    if (updates.autoRelease !== undefined) setCompressorAutoRelease(updates.autoRelease)
    if (updates.makeupDb !== undefined) setCompressorMakeup(updates.makeupDb)
    if (updates.dryWet !== undefined) props.onWetChange(updates.dryWet)
    if (updates.kneeDb !== undefined) setCompressorKnee(updates.kneeDb)
    if (updates.lookaheadMs !== undefined) setCompressorLookahead(updates.lookaheadMs)
    if (updates.detectorMode !== undefined) setCompressorDetector(updates.detectorMode)
    if (updates.dynamicsMode !== undefined) setCompressorDynamics(updates.dynamicsMode)
    if (updates.envelopeCurve !== undefined) setCompressorEnvelope(updates.envelopeCurve)
  }

  const resetCompressor = (): void => {
''',
)
replace_once(
    effects_path,
    '''    props.onThresholdChange(-24)
    props.onRatioChange(4)
    props.onAttackChange(10)
    props.onReleaseChange(120)
    props.onWetChange(1)
    setCompressorAutoRelease(true)
    setCompressorKnee(6)
    setCompressorLookahead(0)
    setCompressorMakeup(0)
    setCompressorDetector("RMS")
    setCompressorDynamics("Compress")
    setCompressorEnvelope("Log")
''',
    '''    props.onThresholdChange(COMPRESSOR_DEFAULTS.thresholdDb)
    props.onRatioChange(COMPRESSOR_DEFAULTS.ratio)
    props.onAttackChange(COMPRESSOR_DEFAULTS.attackMs)
    props.onReleaseChange(COMPRESSOR_DEFAULTS.releaseMs)
    props.onWetChange(COMPRESSOR_DEFAULTS.dryWet)
    setCompressorAutoRelease(COMPRESSOR_DEFAULTS.autoRelease)
    setCompressorKnee(COMPRESSOR_DEFAULTS.kneeDb)
    setCompressorLookahead(COMPRESSOR_DEFAULTS.lookaheadMs)
    setCompressorMakeup(COMPRESSOR_DEFAULTS.makeupDb)
    setCompressorDetector(COMPRESSOR_DEFAULTS.detectorMode)
    setCompressorDynamics(COMPRESSOR_DEFAULTS.dynamicsMode)
    setCompressorEnvelope(COMPRESSOR_DEFAULTS.envelopeCurve)
''',
)
replace_between(
    effects_path,
    '        <div testId="compressor-device"',
    '        <div testId="eq-device"',
    '''        <DeviceCollapseProvider
          collapsed={compressorCollapsed}
          toggle={() => setCompressorCollapsed((collapsed) => !collapsed)}
          contentId={() => safeDeviceContentId("audio-effect:fixture-compressor")}
          canWrite={() => true}
        >
          <div testId="compressor-device" style={{ height: "100%", display: "flex", flexShrink: 0 }}>
            <Compressor
              params={compressorParams()}
              onChange={updateCompressor}
              onToggleEnabled={(enabled) => {
                if (enabled !== props.compressorEnabled) props.onToggleCompressor()
              }}
              onReset={resetCompressor}
            />
          </div>
        </DeviceCollapseProvider>

''',
)

# Replace handmade +/- assertions with the exact Knob accessibility/keyboard
# behavior and verify the exact EffectShell collapse really hides its content.
test_path = "examples/solid1-daw/src/test.tsx"
replace_between(
    test_path,
    '  app.renderer.clickCenterTestId("compressor-threshold-plus")',
    '  app.renderer.scrollTestId("daw-test-viewport", -320, -260)',
    '''  const thresholdSlider = { role: "slider", "aria-label": "Thresh" } as const
  const attackSlider = { role: "slider", "aria-label": "Attack" } as const
  requireCondition(
    app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext") === "-18.0 dB",
    `exact Compressor threshold should start at fixture -18.0 dB, got ${JSON.stringify(app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext"))}`,
  )
  app.renderer.pressKeyCustomProps(thresholdSlider, "PageUp")
  requireCondition(
    app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext") === "-17.0 dB",
    `exact Compressor threshold PageUp should use upstream 1 dB large step, got ${JSON.stringify(app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext"))}`,
  )
  const compressorText = app.renderer.textContent("compressor-device")
  requireText(compressorText, "-120.0 dB", "exact Compressor no-engine output fallback")
  requireCondition(!compressorText.includes("-3.8 dB") && !compressorText.includes("-7.2 dB"), "exact Compressor must not retain invented meter values")
  requireCondition(!app.renderer.hasTestId("compressor-threshold-plus"), "exact Compressor must not retain handmade +/- controls")
  app.renderer.clickTextWithinTestId("compressor-device", "Reset")
  requireCondition(
    app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext") === "-24.0 dB",
    `exact Compressor reset should restore source threshold, got ${JSON.stringify(app.renderer.customPropByCustomProps(thresholdSlider, "aria-valuetext"))}`,
  )
  requireCondition(
    app.renderer.customPropByCustomProps(attackSlider, "aria-valuetext") === "10 ms",
    `exact Compressor reset should restore source attack, got ${JSON.stringify(app.renderer.customPropByCustomProps(attackSlider, "aria-valuetext"))}`,
  )
  app.renderer.clickCustomProps({ "aria-label": "Fold device" })
  requireCondition(app.renderer.hasCustomProps({ "aria-label": "Unfold device" }), "exact EffectShell chevron should expose unfolded action after collapse")
  const collapsedContentStyle = app.renderer.styleCustomPropsWithinTestId("compressor-device", { hidden: true })
  requireCondition(collapsedContentStyle.display === "none", `semantic hidden content should map to native display:none, got ${JSON.stringify(collapsedContentStyle)}`)
  app.renderer.clickCustomProps({ "aria-label": "Unfold device" })
  requireCondition(app.renderer.hasCustomProps({ "aria-label": "Fold device" }), "exact EffectShell chevron should restore fold action after expansion")

''',
)

# The exact source component must now own the visible Compressor implementation.
effects = read(effects_path)
for forbidden in ["compressor-threshold-plus", 'value="-3.8 dB"', 'value="-7.2 dB"', "compressorView"]:
    if forbidden in effects:
        raise SystemExit(f"handmade Compressor residue remains: {forbidden}")
if '<Compressor' not in effects or 'DeviceCollapseProvider' not in effects:
    raise SystemExit("exact Compressor mount is missing")
