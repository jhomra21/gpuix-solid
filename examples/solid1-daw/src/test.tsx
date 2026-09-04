import { existsSync, statSync } from "node:fs"
import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeDescendantClassStyle,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"
import { UpstreamUiProbe } from "./upstream-ui-probe"

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  }
}

function bottom(bounds: { y: number; height: number }): number {
  return bounds.y + bounds.height
}

function right(bounds: { x: number; width: number }): number {
  return bounds.x + bounds.width
}

type NativeBounds = { x: number; y: number; width: number; height: number }
function requireAncestorBounds(
  bounds: NativeBounds[],
  predicate: (bounds: NativeBounds) => boolean,
  label: string,
): NativeBounds {
  const match = [...bounds].reverse().find(predicate)
  if (!match) throw new Error(`${label}: no matching painted ancestor in ${JSON.stringify(bounds)}`)
  return match
}

const transportFrameStyle = resolveNativeClassStyle("grid grid-cols-[1fr_auto_1fr]", undefined)
requireCondition(
  transportFrameStyle?.display === "flex" && transportFrameStyle.flexDirection === "row",
  `upstream transport grid should translate to a native flex row, got ${JSON.stringify(transportFrameStyle)}`,
)
requireCondition(resolveNativeClassStyle("justify-self-start flex", undefined)?.flexGrow === 1, "transport left zone should preserve a flexible side track")
requireCondition(resolveNativeClassStyle("justify-self-center flex", undefined)?.flexShrink === 0, "transport center zone should remain intrinsic")
requireCondition(resolveNativeClassStyle("justify-self-end flex", undefined)?.justifyContent === "flex-end", "transport right zone should align to the end")

if (!hasNativeTestRenderer) {
  console.log("solid1 DAW source-structured port: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot(1440, 900)
  app.render(() => (
    <div testId="daw-test-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))

  const viewportWidth = app.renderer.boundsTestId("daw-test-viewport").width
  const rootText = () => app.renderer.textContent("daw-showcase")

  requireText(rootText(), "2.75s", "initial playhead")
  for (const menuLabel of ["File", "Edit", "View", "Settings", "Tracks"]) {
    requireText(rootText(), menuLabel, `source transport menu ${menuLabel}`)
  }
  requireCondition(app.renderer.hasTestId("browser-sidebar"), "browser sidebar should start open")
  const drumsTrack = { "aria-label": "Select track 1: Drums" } as const
  const returnTrack = { "aria-label": "Select track 5: A-Reverb" } as const
  const masterEffects = { title: "Show master effects" } as const
  requireCondition(app.renderer.hasCustomProps(drumsTrack), "exact source TrackSidebar should mount the first track selector")
  requireCondition(app.renderer.hasCustomProps(returnTrack), "exact source TrackSidebar should mount the Return track selector")
  requireCondition(app.renderer.hasCustomProps(masterEffects), "exact source MasterSidebarRow should mount the Master effects control")
  requireCondition(app.renderer.hasTestId("master-timeline"), "Master timeline row should be mounted")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects panel should start open")
  requireCondition(!rootText().includes("Drop files here to create a new track"), "fixture must not invent the new-track drop row")

  const compressorColumnLeft = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 1)
  const compressorColumnMiddle = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 2)
  const compressorColumnRight = resolveNativeDescendantClassStyle("grid-cols-[84px_1fr_96px]", undefined, "div", true, 3)
  requireCondition(compressorColumnLeft?.width === 84 && compressorColumnLeft.minWidth === 84, "positional descendant compatibility should preserve the source 84px Compressor left column")
  requireCondition(compressorColumnMiddle?.flexGrow === 1 && compressorColumnMiddle.flexBasis === 0 && compressorColumnMiddle.minWidth === 0, "positional descendant compatibility should preserve the source flexible Compressor middle column")
  requireCondition(compressorColumnRight?.width === 96 && compressorColumnRight.minWidth === 96, "positional descendant compatibility should preserve the source 96px Compressor right column")

  const compressorStatusTypography = resolveNativeClassStyle("text-2xs leading-tight", undefined)
  requireCondition(compressorStatusTypography?.fontSize === 10, "text-2xs should preserve the source 10px Compressor status size")
  requireCondition(compressorStatusTypography?.lineHeight === 12.5, "leading-tight should resolve against the merged 10px source font size")
  const inheritedLeadingNone = resolveNativeClassStyle("leading-none", undefined, 12)
  requireCondition(inheritedLeadingNone?.lineHeight === 12, "leading-none should resolve against inherited native font size")

  const knobBorderPaint = resolveNativeClassSvgPaint("stroke-border", undefined)
  requireCondition(
    knobBorderPaint?.stroke !== undefined && (knobBorderPaint.stroke.startsWith("#") || knobBorderPaint.stroke.startsWith("rgba(")),
    `stroke-border should compile to normalized native SVG paint, got ${JSON.stringify(knobBorderPaint)}`,
  )
  const knobActivePaint = resolveNativeClassSvgPaint("stroke-cyan-400", undefined)
  requireCondition(
    knobActivePaint?.stroke !== undefined && knobActivePaint.stroke !== knobBorderPaint?.stroke,
    "source knob accent stroke should remain distinct from the border stroke",
  )

  const collapsedEffectShell = resolveNativeClassAttributeStyle(
    "effect-shell",
    undefined,
    new Map([["data-device-collapsed", "true"]]),
  )
  requireCondition(
    collapsedEffectShell?.width === 26 &&
      collapsedEffectShell.minWidth === 26 &&
      collapsedEffectShell.maxWidth === 26 &&
      collapsedEffectShell.flexGrow === 0 &&
      collapsedEffectShell.flexShrink === 0 &&
      collapsedEffectShell.flexBasis === 26,
    "attribute-conditioned native styles should preserve the exact 26px collapsed EffectShell flex contract",
  )

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
  const timelineBounds = app.renderer.boundsTestId("timeline-surface")
  const drumsAncestors = app.renderer.ancestorBoundsCustomProps(drumsTrack)
  const sidebarBounds = requireAncestorBounds(
    drumsAncestors,
    (bounds) => bounds.width >= 330 && bounds.width <= 340 && bounds.height > 300,
    "exact source TrackSidebar bounds",
  )
  requireCondition(browserBounds.width >= 275, `browser should preserve ~280px source width, got ${browserBounds.width}`)
  requireCondition(Math.abs(app.renderer.boundsTextWithinTestId("browser-sidebar", "Assets").height - 24) <= 1, "browser tabs should preserve 24px rows")
  requireCondition(sidebarBounds.width >= 330, `track sidebar should preserve ~336px source width, got ${sidebarBounds.width}`)
  requireCondition(browserBounds.x < timelineBounds.x && sidebarBounds.x > timelineBounds.x, "browser / timeline / mixer ordering should match source")
  requireCondition(app.renderer.boundsTestId("lane-drums").height >= 92, "normal timeline lanes should preserve ~96px source height")

  const timelineScrolling = app.renderer.boundsTestId("timeline-scrolling-tracks")
  const timelineFooter = app.renderer.boundsTestId("timeline-sticky-footer")
  requireCondition(Math.abs(bottom(timelineScrolling) - timelineFooter.y) <= 2, "timeline scrolling viewport should end at the sticky Return/Master footer")

  const returnTimeline = app.renderer.boundsTestId("lane-return-a")
  const returnSidebar = requireAncestorBounds(
    app.renderer.ancestorBoundsCustomProps(returnTrack),
    (bounds) => bounds.width >= 330 && bounds.width <= 340 && bounds.height >= 90 && bounds.height <= 100,
    "exact source Return sidebar row",
  )
  const masterTimeline = app.renderer.boundsTestId("master-timeline")
  const masterSidebar = requireAncestorBounds(
    app.renderer.ancestorBoundsCustomProps(masterEffects),
    (bounds) => bounds.width >= 330 && bounds.width <= 340 && bounds.height >= 90 && bounds.height <= 100,
    "exact source Master sidebar row",
  )
  requireCondition(returnTimeline.y >= timelineFooter.y, "Return timeline row should live inside the sticky footer")
  requireCondition(Math.abs(returnSidebar.y - returnTimeline.y) <= 2, "exact source Return sidebar row should align with the Return timeline row")
  requireCondition(masterTimeline.y > returnTimeline.y + 80, "Master timeline row should follow Return")
  requireCondition(Math.abs(masterSidebar.y - masterTimeline.y) <= 2, "exact source Master sidebar row should align with the Master timeline row")

  const overviewSvgSource = app.renderer.customPropStringContainingAll("source", [
    'viewBox="0 0 100 40"',
    'fill="#00a76c"',
  ])
  const drumsOverviewPathMarkup = overviewSvgSource.match(/<path[^>]*fill="#00a76c"[^>]*>/)?.[0]
  const drumsOverviewPathData = drumsOverviewPathMarkup?.match(/\bd="([^"]+)"/)?.[1]
  requireCondition(
    drumsOverviewPathData?.startsWith("M") === true && drumsOverviewPathData.split("M").length === 3,
    `exact ArrangementOverview should combine both Drums clips into one source SVG path, got ${JSON.stringify(drumsOverviewPathData)}`,
  )

  const drumsLaneHeight = app.renderer.boundsTestId("lane-drums").height
  const drumsRow = () => requireAncestorBounds(
    app.renderer.ancestorBoundsCustomProps(drumsTrack),
    (bounds) => bounds.width >= 330 && bounds.width <= 340 && bounds.height >= 30 && bounds.height <= 160,
    "exact source Drums sidebar row",
  )
  const drumsSidebarHeight = drumsRow().height
  requireCondition(Math.abs(drumsLaneHeight - drumsSidebarHeight) <= 1, "Drums timeline and exact source mixer row should start aligned")

  requireCondition(app.renderer.hasCustomProps({ title: "Track output" }), "exact source routing output select should be mounted")
  requireCondition(app.renderer.hasCustomProps({ title: "Track send" }), "exact source routing send select should be mounted")

  app.renderer.scrollTestId("daw-test-viewport", -320, 0)
  const muteOn = { "aria-label": "Deactivate track 1" } as const
  const muteOff = { "aria-label": "Activate track 1" } as const
  const soloOff = { "aria-label": "Solo track 1" } as const
  const soloOn = { "aria-label": "Unsolo track 1" } as const
  const armOff = { "aria-label": "Arm track 1 for recording" } as const
  const armOn = { "aria-label": "Disarm track 1 for recording" } as const
  const volume = { "aria-label": "Track 1 volume" } as const
  const visibleMixerControl = app.renderer.boundsCustomProps(muteOn)
  requireCondition(
    visibleMixerControl.x >= 0 && right(visibleMixerControl) <= viewportWidth,
    `exact source mixer controls should be visible before interaction, got ${JSON.stringify(visibleMixerControl)}`,
  )
  const soloBounds = app.renderer.boundsCustomProps(soloOff)
  const armBounds = app.renderer.boundsCustomProps(armOff)
  const volumeBounds = app.renderer.boundsCustomProps(volume)
  const volumeAncestors = app.renderer.ancestorBoundsCustomProps(volume)
  requireCondition(
    visibleMixerControl.width >= soloBounds.width * 2.5 && visibleMixerControl.width <= soloBounds.width * 3.5,
    `source 3fr/1fr mixer geometry should keep the track button roughly three times Solo width: ${JSON.stringify({ mute: visibleMixerControl, solo: soloBounds })}`,
  )
  requireCondition(
    Math.abs(soloBounds.width - armBounds.width) <= 2 && soloBounds.width <= 20 && armBounds.width <= 20,
    `source Solo/Record 1fr controls should stay compact and equal width: ${JSON.stringify({ solo: soloBounds, arm: armBounds })}`,
  )
  requireCondition(
    volumeBounds.width >= soloBounds.width * 2.5 && volumeBounds.width < 70,
    `source mixer volume should shrink into its 3fr column instead of retaining intrinsic range width: ${JSON.stringify({ volume: volumeBounds, ancestors: volumeAncestors })}`,
  )

  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  app.renderer.clickCustomProps(muteOn)
  requireCondition(app.renderer.hasCustomProps(muteOff), "exact source mute should expose Activate after muting")
  requireCondition(app.renderer.styleCustomProps(muteOff).backgroundColor !== muteBackground, "exact source mute should change its painted state")
  app.renderer.clickCustomProps(muteOff)
  requireCondition(app.renderer.hasCustomProps(muteOn), "exact source mute should restore Deactivate after unmuting")

  app.renderer.clickCustomProps(soloOff)
  requireCondition(app.renderer.hasCustomProps(soloOn), "exact source solo should expose Unsolo after activation")
  const soloActiveBackground = app.renderer.styleCustomProps(soloOn).backgroundColor ?? ""
  requireCondition(
    soloActiveBackground.startsWith("rgba(") && soloActiveBackground.endsWith(", 0.9)"),
    `exact source bg-blue-500/90 Solo state should reach native as translucent sRGB, got ${JSON.stringify(soloActiveBackground)}`,
  )
  app.renderer.clickCustomProps(soloOn)
  requireCondition(app.renderer.hasCustomProps(soloOff), "exact source solo should restore after second activation")

  const armInactiveBackground = app.renderer.styleCustomProps(armOff).backgroundColor ?? ""
  app.renderer.clickCustomProps(armOff)
  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")
  const armActiveBackground = app.renderer.styleCustomProps(armOn).backgroundColor ?? ""
  requireCondition(
    armActiveBackground !== "" && armActiveBackground !== armInactiveBackground,
    `exact source record-arm bg-red-500 state should change native paint, got ${JSON.stringify({ inactive: armInactiveBackground, active: armActiveBackground })}`,
  )
  app.renderer.clickCustomProps(armOn)
  requireCondition(app.renderer.hasCustomProps(armOff), "exact source record arm should restore after second activation")

  const volumeBefore = app.renderer.customPropByCustomProps(volume, "aria-valuetext")
  app.renderer.dragCustomProps(volume, 20, 0)
  const volumeAfter = app.renderer.customPropByCustomProps(volume, "aria-valuetext")
  requireCondition(volumeAfter !== volumeBefore, `exact source mixer volume should respond to pointer drag, before ${JSON.stringify(volumeBefore)}, after ${JSON.stringify(volumeAfter)}`)

  app.renderer.clickCustomProps({ title: "Collapse track" })
  const collapsedLaneHeight = app.renderer.boundsTestId("lane-drums").height
  const collapsedSidebarHeight = drumsRow().height
  requireCondition(Math.abs(collapsedLaneHeight - 32) <= 1, `collapsed timeline lane should preserve source 32px height, got ${collapsedLaneHeight}`)
  requireCondition(Math.abs(collapsedSidebarHeight - 32) <= 1, `collapsed exact source mixer row should preserve 32px height, got ${collapsedSidebarHeight}`)
  requireCondition(Math.abs(collapsedLaneHeight - collapsedSidebarHeight) <= 1, "collapsed timeline and exact source mixer geometry should stay aligned")
  app.renderer.clickCustomProps({ title: "Expand track" })
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-drums").height - drumsLaneHeight) <= 1, "expanding should restore the original timeline lane height")
  requireCondition(Math.abs(drumsRow().height - drumsSidebarHeight) <= 1, "expanding should restore the original exact source mixer row height")

  const showAutomation = { "aria-label": "Show automation for track 1" } as const
  const hideAutomation = { "aria-label": "Hide automation for track 1" } as const
  const addAutomation = { "aria-label": "Add automation lane for track 1" } as const
  app.renderer.clickCustomProps(showAutomation)
  requireCondition(app.renderer.hasCustomProps(hideAutomation), "exact source A control should switch to Hide automation")
  const automationSvgSource = app.renderer.customPropStringContainingAll("source", [
    'stroke="#ef4444"',
    'fill="#ef4444"',
  ])
  requireCondition(
    automationSvgSource.includes('<path') && automationSvgSource.includes('<circle'),
    "exact source A control should expose the AutomationLane SVG path and points",
  )
  const oneAutomationLaneHeight = app.renderer.boundsTestId("lane-drums").height
  const oneAutomationSidebarHeight = drumsRow().height
  requireCondition(Math.abs(oneAutomationLaneHeight - drumsLaneHeight - 48) <= 1, "one automation lane should add the source 48px lane height")
  requireCondition(Math.abs(oneAutomationLaneHeight - oneAutomationSidebarHeight) <= 1, "one automation lane should keep timeline and exact source mixer geometry aligned")

  requireCondition(app.renderer.hasCustomProps(addAutomation), "exact source disabled Add automation control should remain mounted")
  app.renderer.clickCustomProps(addAutomation)
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-drums").height - oneAutomationLaneHeight) <= 1, "Add automation must not invent a second lane when Volume is the only source parameter")
  requireCondition(Math.abs(drumsRow().height - oneAutomationSidebarHeight) <= 1, "disabled Add automation must not change exact source mixer geometry")

  app.renderer.clickCustomProps(hideAutomation)
  requireCondition(app.renderer.hasCustomProps(showAutomation), "exact source A control should restore Show automation after hiding")
  requireCondition(
    Math.abs(app.renderer.boundsTestId("lane-drums").height - drumsLaneHeight) <= 1,
    "hiding the only source automation target should remove its 48px timeline lane",
  )
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-drums").height - drumsLaneHeight) <= 1, "closing automation should restore timeline geometry")
  requireCondition(Math.abs(drumsRow().height - drumsSidebarHeight) <= 1, "closing automation should restore exact source mixer geometry")
  app.renderer.scrollTestId("daw-test-viewport", 0, 0)

  for (const testId of [
    "Hide browser sidebar",
    "Start recording",
    "Play",
    "Stop",
    "Toggle metronome",
    "Toggle loop region",
    "Toggle snap to grid",
  ]) {
    requireCondition(app.renderer.hasTestId(testId), `source aria label should reach the native host: ${testId}`)
  }
  requireText(rootText(), "1/4", "source default grid resolution")
  requireCondition(!rootText().includes("1/32"), "fixture must not invent a 1/32 grid option")

  const screenshotPath = "/tmp/gpuix-solid1-daw-source-structured.png"
  app.renderer.captureScreenshot(screenshotPath)
  requireCondition(existsSync(screenshotPath) && statSync(screenshotPath).size > 0, "DAW parity screenshot should exist and be non-empty")

  app.renderer.clickTestId("Play")
  requireText(rootText(), "3.00s", "play advances playhead")
  requireCondition(app.renderer.hasTestId("Pause"), "play control should expose Pause while playing")

  app.renderer.clickTextWithinTestId("browser-sidebar", "Effects")
  app.renderer.typeFirstInputWithinTestId("browser-sidebar", "comp")
  const browserSearchText = app.renderer.textContent("browser-sidebar")
  requireText(browserSearchText, "Compressor", "effects search")
  requireCondition(!browserSearchText.includes("EQ Eight"), "effects search should filter unrelated entries")

  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  requireCondition((app.renderer.scrollOffsetTestId("daw-test-viewport")?.[1] ?? 0) < 0, "test viewport should scroll to lower controls")
  const thresholdSlider = { role: "slider", "aria-label": "Thresh" } as const
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

  app.renderer.scrollTestId("daw-test-viewport", -320, -260)
  app.renderer.scrollTestId("effects-panel", -540, 0)
  requireCondition((app.renderer.scrollOffsetTestId("effects-panel")?.[0] ?? 0) < 0, "effects chain should scroll horizontally to EQ")
  const visibleEqBand = app.renderer.boundsTestId("eq-band-7")
  requireCondition(
    visibleEqBand.x >= 0 && right(visibleEqBand) <= viewportWidth,
    `EQ high band should be visible before interaction, got ${JSON.stringify(visibleEqBand)}`,
  )
  app.renderer.clickCenterTestId("eq-band-7")
  requireText(app.renderer.textContent("eq-selected-gain-value"), "0.0 dB", "EQ high band selection")
  app.renderer.clickCenterTestId("eq-filter-type-7")
  const eqFilterMenuText = app.renderer.textContentRoot()
  for (const option of ["Low Pass", "High Pass", "Band Pass", "Notch", "Low Shelf", "High Shelf", "Peaking", "All Pass"]) {
    requireText(eqFilterMenuText, option, `EQ filter source option ${option}`)
  }
  app.renderer.clickText("Notch")
  requireCondition(!app.renderer.textContentRoot().includes("Low Pass"), "selecting an EQ filter type should dismiss the source menu")
  app.renderer.clickCenterTestId("eq-selected-gain-plus")
  requireText(app.renderer.textContent("eq-selected-gain-value"), "+1.0 dB", "EQ high gain")
  app.renderer.clickCenterTestId("eq-reset")
  requireText(app.renderer.textContent("eq-selected-gain-value"), "0.0 dB", "EQ source reset gain")
  requireText(app.renderer.textContent("eq-selected-frequency-value"), "6.00 kHz", "EQ source reset frequency")
  requireText(app.renderer.textContent("eq-selected-q-value"), "1.00", "EQ source reset Q")

  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  app.renderer.clickTextWithinTestId("bottom-panel", "CLIP")
  requireCondition(app.renderer.hasTestId("effects-panel") && !app.renderer.hasTestId("clip-panel"), "MIDI selection must keep the source Clip tab disabled")

  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  const drumsAudioClip = { title: "Drum Loop 01" } as const
  requireCondition(app.renderer.hasCustomProps(drumsAudioClip), "exact ClipComponent should expose the source clip title")
  const unselectedDrumsClipStyle = app.renderer.styleCustomPropsWithinTestId("lane-drums", drumsAudioClip)
  requireCondition(
    unselectedDrumsClipStyle.backgroundColor === "rgba(0, 167, 108, 0.2)",
    `exact unselected audio clip should preserve the source 20% color mix, got ${JSON.stringify(unselectedDrumsClipStyle)}`,
  )
  requireCondition(
    unselectedDrumsClipStyle.borderRadius === undefined,
    `exact source ClipComponent should not gain a native rounded-corner approximation, got ${JSON.stringify(unselectedDrumsClipStyle)}`,
  )
  app.renderer.clickCenterCustomProps(drumsAudioClip)
  requireCondition(app.renderer.hasTestId("effects-panel") && !app.renderer.hasTestId("clip-panel"), "first exact audio-clip tap should select without opening Sample Detail")
  const selectedDrumsClipStyle = app.renderer.styleCustomPropsWithinTestId("lane-drums", drumsAudioClip)
  requireCondition(
    selectedDrumsClipStyle.backgroundColor === "rgba(0, 167, 108, 0.3)" && selectedDrumsClipStyle.boxShadow !== undefined,
    `first exact audio-clip tap should preserve the source 30% selected color mix and selection ring, got ${JSON.stringify(selectedDrumsClipStyle)}`,
  )
  app.renderer.clickCenterCustomProps(drumsAudioClip)
  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  requireCondition(!app.renderer.hasTestId("effects-panel"), "second exact audio-clip tap should replace Effects with Sample Detail")
  requireText(rootText(), "SAMPLE DETAIL", "exact Sample Detail rail")
  requireText(rootText(), "Drum Loop 01", "exact selected audio sample")
  requireText(rootText(), "Source BPM", "exact sample controls")
  requireText(rootText(), "BEAT GRID", "exact SampleDetailWaveform header")

  const warpToggle = { type: "checkbox" } as const
  requireCondition(app.renderer.hasCustomProps(warpToggle), "exact SampleClipPanel Warp checkbox should mount")
  app.renderer.clickCustomProps(warpToggle)
  requireText(rootText(), "Beat Offset", "exact Warp control should reveal source beat controls")
  requireCondition(
    app.renderer.hasCustomProps({ type: "number", min: "-16", max: "16", step: "0.001" }),
    "exact SampleClipPanel Beat Offset input should mount",
  )

  const sourceBpmInput = { type: "number", min: "1", step: "0.01" } as const
  requireCondition(Number(app.renderer.customPropByCustomProps(sourceBpmInput, "value")) === 120, "exact Source BPM should start at project tempo")
  requireCondition(app.renderer.hasCustomProps({ value: "repitch" }), "exact warp Mode select should start in Re-Pitch")

  app.renderer.clickText("Analyze")
  // The pinned source intentionally chains ensureClipBuffer -> analyzeClip ->
  // async analysis -> autoApply. Drain that deterministic promise chain before
  // asserting the final applied state; one microtask only observes an
  // intermediate state and races the exact source behavior.
  for (let turn = 0; turn < 6; turn++) await Promise.resolve()
  app.renderer.flush()
  requireText(rootText(), "Suggested 118.00 BPM, confidence 94%. Applied.", "deterministic BPM service through exact source UI")
  requireCondition(Number(app.renderer.customPropByCustomProps(sourceBpmInput, "value")) === 118, "high-confidence source BPM analysis should auto-apply")
  requireCondition(app.renderer.hasCustomProps({ value: "stretch" }), "high-confidence BPM analysis should switch the exact Mode select to Stretch")

  const gainInput = { type: "range", min: "-60", max: "6.02", step: "0.1" } as const
  const gainBounds = app.renderer.boundsCustomProps(gainInput)
  const gainStyle = app.renderer.styleCustomProps(gainInput)
  requireCondition(gainBounds.width > 100 && gainBounds.height > 0, `exact Clip Gain must have intrinsic painted bounds: ${JSON.stringify(gainBounds)}`)
  requireCondition(gainBounds.x >= 0 && gainBounds.y >= 0 && gainBounds.x + gainBounds.width <= 1280 && gainBounds.y + gainBounds.height <= 900, `exact Clip Gain must remain inside the native viewport: ${JSON.stringify(gainBounds)}`)
  requireCondition(gainStyle.pointerEvents === "auto", `exact Clip Gain must own a native hit surface: ${JSON.stringify(gainStyle)}`)
  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  app.renderer.dragCustomProps(gainInput, 20, 0)
  const gainAfter = app.renderer.customPropByCustomProps(gainInput, "value")
  requireCondition(gainAfter !== gainBefore, `exact Clip Gain range should update fixture clip state: ${JSON.stringify(gainBefore)} -> ${JSON.stringify(gainAfter)}`)

  app.renderer.scrollTestId("daw-test-viewport", -320, -260)
  const exactHideBounds = app.renderer.boundsText("HIDE")
  requireCondition(
    exactHideBounds.x >= 0 && right(exactHideBounds) <= viewportWidth,
    `exact Sample Detail HIDE should be visible before interaction, got ${JSON.stringify(exactHideBounds)}`,
  )
  app.renderer.clickText("HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "exact Sample Detail footer Hide should close the shared panel")
  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  app.renderer.clickTextWithinTestId("bottom-panel-closed", "EFFECTS")
  requireCondition(app.renderer.hasTestId("effects-panel"), "closed source footer Effects action should restore devices")

  app.renderer.scrollTestId("daw-test-viewport", -320, -260)
  const hideBounds = app.renderer.boundsTextWithinTestId("bottom-panel", "HIDE")
  requireCondition(hideBounds.x >= 0 && hideBounds.x + hideBounds.width <= viewportWidth, "HIDE control should be visible after viewport scroll")

  const workspaceBeforeHide = app.renderer.boundsTestId("timeline-workspace")
  const footerBeforeHide = app.renderer.boundsTestId("timeline-sticky-footer")
  app.renderer.clickTextWithinTestId("bottom-panel", "HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed") && !app.renderer.hasTestId("bottom-panel"), "Hide should collapse the fixed panel")
  const workspaceAfterHide = app.renderer.boundsTestId("timeline-workspace")
  const footerAfterHide = app.renderer.boundsTestId("timeline-sticky-footer")
  requireCondition(Math.abs(workspaceAfterHide.height - workspaceBeforeHide.height) <= 1, "fixed panel must not resize TimelineWorkspace")
  requireCondition(footerAfterHide.y > footerBeforeHide.y + 300, "sticky Return/Master footer should move down when the fixed panel collapses")

  app.renderer.clickTextWithinTestId("bottom-panel-closed", "SHOW")
  requireCondition(app.renderer.hasTestId("bottom-panel"), "Show should restore bottom panel")
  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  app.renderer.clickTestId("Stop")
  requireText(rootText(), "0.00s", "stop resets playhead")
  console.log("solid1 DAW native interactions: source menus, mixer controls, clip open, effects, and panel behavior passed")

  app.unmount()

  const sourceUi = createTestRoot()
  sourceUi.render(() => <UpstreamUiProbe />)

  const sourceButtonBounds = sourceUi.renderer.boundsTestId("upstream-button")
  requireCondition(
    Math.abs(sourceButtonBounds.width - 40) <= 1 && Math.abs(sourceButtonBounds.height - 40) <= 1,
    `copied DAW icon button should resolve size-10 to 40x40, got ${sourceButtonBounds.width}x${sourceButtonBounds.height}`,
  )
  const sourceIconStyle = resolveNativeDescendantClassStyle(
    "[&_svg]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    undefined,
    "svg",
    false,
  )
  requireCondition(sourceIconStyle?.width === 16 && sourceIconStyle.height === 16, "copied DAW button descendant SVG utility should resolve to 16x16")
  sourceUi.renderer.clickTestId("upstream-button")
  requireText(sourceUi.renderer.textContent("upstream-button-count"), "Copied Button presses: 1", "copied DAW button")

  const avatarBounds = sourceUi.renderer.boundsTestId("upstream-avatar")
  requireCondition(Math.abs(avatarBounds.width - 40) <= 1 && Math.abs(avatarBounds.height - 40) <= 1, "copied DAW avatar should preserve size-10")
  sourceUi.renderer.typeTestId("upstream-text-input", "Bass")
  requireText(sourceUi.renderer.textContent("upstream-text-error"), "Invalid route", "copied DAW TextField invalid state")

  requireCondition(!sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should start closed")
  sourceUi.renderer.hoverTestId("upstream-tooltip-trigger")
  requireCondition(sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should open through native hover")

  sourceUi.unmount()
  console.log("solid1 DAW source-structured port: passed")
}
