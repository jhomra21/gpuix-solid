from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAW = ROOT / "examples/solid1-daw"

# SampleDetailWaveform only needs ResizeObserver for native bounds measurement.
# Keep that browser contract in the host rather than editing the pinned component.
dom_path = ROOT / "packages/solid1/src/dom-environment.ts"
dom = dom_path.read_text()
resize_types_anchor = '''type CompatMutationCallback = (records: CompatMutationRecord[]) => void

type CompatMutationObserverConstructor = new (callback: CompatMutationCallback) => CompatMutationObserver
'''
resize_types = '''type CompatMutationCallback = (records: CompatMutationRecord[]) => void

type CompatResizeObserverEntry = {
  target: HostElementNode
  contentRect: CompatRect
}

type CompatResizeObserverCallback = (entries: CompatResizeObserverEntry[]) => void

type CompatResizeObserverConstructor = new (callback: CompatResizeObserverCallback) => CompatResizeObserver

type CompatMutationObserverConstructor = new (callback: CompatMutationCallback) => CompatMutationObserver
'''
if "type CompatResizeObserverEntry" not in dom:
    if resize_types_anchor not in dom:
        raise SystemExit("ResizeObserver type anchor missing")
    dom = dom.replace(resize_types_anchor, resize_types, 1)

window_anchor = '''  MutationObserver?: CompatMutationObserverConstructor
  NodeFilter?: CompatNodeFilter
'''
window_replacement = '''  MutationObserver?: CompatMutationObserverConstructor
  ResizeObserver?: CompatResizeObserverConstructor
  NodeFilter?: CompatNodeFilter
'''
if "ResizeObserver?: CompatResizeObserverConstructor" not in dom:
    if window_anchor not in dom:
        raise SystemExit("ResizeObserver window anchor missing")
    dom = dom.replace(window_anchor, window_replacement, 1)

window_install_anchor = '''  windowTarget.MutationObserver = CompatMutationObserver
  windowTarget.NodeFilter = NODE_FILTER
'''
window_install = '''  windowTarget.MutationObserver = CompatMutationObserver
  windowTarget.ResizeObserver = CompatResizeObserver
  windowTarget.NodeFilter = NODE_FILTER
'''
if "windowTarget.ResizeObserver = CompatResizeObserver" not in dom:
    if window_install_anchor not in dom:
        raise SystemExit("ResizeObserver window install anchor missing")
    dom = dom.replace(window_install_anchor, window_install, 1)

global_install_anchor = '''  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    writable: true,
    value: CompatMutationObserver,
  })
  Object.defineProperty(globalThis, "requestAnimationFrame", {
'''
global_install = '''  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    writable: true,
    value: CompatMutationObserver,
  })
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: CompatResizeObserver,
  })
  Object.defineProperty(globalThis, "requestAnimationFrame", {
'''
if 'Object.defineProperty(globalThis, "ResizeObserver"' not in dom:
    if global_install_anchor not in dom:
        raise SystemExit("ResizeObserver global install anchor missing")
    dom = dom.replace(global_install_anchor, global_install, 1)

class_anchor = "class CompatMutationObserver {\n"
resize_class = '''class CompatResizeObserver {
  readonly #callback: CompatResizeObserverCallback
  readonly #targets = new Set<HostElementNode>()

  constructor(callback: CompatResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: HostElementNode): void {
    this.#targets.add(target)
    this.#callback([{ target, contentRect: target.getBoundingClientRect() }])
  }

  unobserve(target: HostElementNode): void {
    this.#targets.delete(target)
  }

  disconnect(): void {
    this.#targets.clear()
  }
}

class CompatMutationObserver {
'''
if "class CompatResizeObserver" not in dom:
    if class_anchor not in dom:
        raise SystemExit("ResizeObserver class anchor missing")
    dom = dom.replace(class_anchor, resize_class, 1)
dom_path.write_text(dom)

parity_path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
parity = parity_path.read_text()
if 'from "../src/dom-environment.ts"' not in parity:
    import_anchor = 'import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"\n'
    if import_anchor not in parity:
        raise SystemExit("host parity import anchor missing")
    parity = parity.replace(import_anchor, import_anchor + 'import { installDomEventEnvironment } from "../src/dom-environment.ts"\n', 1)
resize_test_anchor = '''const semanticButton = createHostElement("div", "button")
'''
resize_test = '''installDomEventEnvironment()
const resizeElement = document.createElement("div")
let resizeHeight: number | undefined
const resizeObserver = new ResizeObserver((entries) => {
  resizeHeight = entries[0]?.contentRect.height
})
resizeObserver.observe(resizeElement)
resizeObserver.disconnect()
if (resizeHeight === undefined) throw new Error("native ResizeObserver must report initial host bounds")

const semanticButton = createHostElement("div", "button")
'''
if "native ResizeObserver must report initial host bounds" not in parity:
    if resize_test_anchor not in parity:
        raise SystemExit("host parity ResizeObserver anchor missing")
    parity = parity.replace(resize_test_anchor, resize_test, 1)
parity_path.write_text(parity)

model_path = DAW / "src/native/model.ts"
model = model_path.read_text()
if not model.startswith('import type { AudioWarp }'):
    model = 'import type { AudioWarp } from "../upstream/packages/timeline-core/types"\n\n' + model
clip_anchor = '''  color?: string
  waveform: number[]
}'''
clip_replacement = '''  color?: string
  waveform: number[]
  audioWarp?: AudioWarp
  gain?: number
}'''
if "audioWarp?: AudioWarp" not in model:
    if clip_anchor not in model:
        raise SystemExit("NativeClip state anchor missing")
    model = model.replace(clip_anchor, clip_replacement, 1)
model_path.write_text(model)

panels_path = DAW / "src/native/TimelinePanels.tsx"
panels_path.write_text('''import { Show, type JSX } from "solid-js"
import type { AudioEngine } from "../compat/audio-engine"
import type { BpmDetectionService } from "../compat/bpm-detection-service"
import type { AudioWarp } from "../upstream/packages/timeline-core/types"
import SampleDetailPanel from "../upstream/components/timeline/SampleDetailPanel"
import { getBottomPanelMountedFootprintPx } from "../upstream/lib/bottom-panel-layout"
import EffectsPanel, { type EffectsPanelProps } from "./EffectsPanel"
import TimelineBottomPanelFooter from "./TimelineBottomPanelFooter"
import TimelineBottomPanelShell from "./TimelineBottomPanelShell"
import type { BottomTab, NativeClip } from "./model"
import { sourceClip } from "./sourceTrackAdapter"
import { dawTheme } from "./theme"

export interface TimelinePanelsProps extends EffectsPanelProps {
  open: boolean
  activeTab: BottomTab
  heightPx: number
  projectBpm: number
  onOpen: () => void
  onClose: () => void
  onEffectsTabClick: () => void
  onClipTabClick: () => void
  onHeightPreview: (heightPx: number) => void
  onHeightCommit: (heightPx: number) => void
  selectedClip: NativeClip | undefined
  audioEngine: AudioEngine
  bpmDetection: BpmDetectionService
  onClipWarpChange: (clipId: string, audioWarp: AudioWarp) => void
  onClipGainChange: (clipId: string, gain: number) => void
}

const TimelinePanels = (props: TimelinePanelsProps): JSX.Element => {
  const canOpenClip = () => props.selectedClip?.kind === "audio"
  const sourceAudioClip = () => {
    const clip = props.selectedClip
    return clip?.kind === "audio" ? sourceClip(clip) : undefined
  }
  const footer = () => (
    <TimelineBottomPanelFooter
      activeTab={props.activeTab}
      toggleLabel={props.open ? "Hide" : "Show"}
      onEffectsTabClick={props.onEffectsTabClick}
      onClipTabClick={props.activeTab === "clip" || canOpenClip() ? props.onClipTabClick : undefined}
      onToggle={props.open ? props.onClose : props.onOpen}
    />
  )
  const effectsPanel = () => (
    <TimelineBottomPanelShell heightPx={props.heightPx} footer={footer()}>
      <EffectsPanel
        compressorEnabled={props.compressorEnabled}
        onToggleCompressor={props.onToggleCompressor}
        compressorRatio={props.compressorRatio}
        onRatioChange={props.onRatioChange}
        compressorAttack={props.compressorAttack}
        onAttackChange={props.onAttackChange}
        compressorRelease={props.compressorRelease}
        onReleaseChange={props.onReleaseChange}
        compressorThreshold={props.compressorThreshold}
        onThresholdChange={props.onThresholdChange}
        compressorWet={props.compressorWet}
        onWetChange={props.onWetChange}
        eqEnabled={props.eqEnabled}
        onToggleEq={props.onToggleEq}
        eqLowGain={props.eqLowGain}
        onEqLowGain={props.onEqLowGain}
        eqMidGain={props.eqMidGain}
        onEqMidGain={props.onEqMidGain}
        eqHighGain={props.eqHighGain}
        onEqHighGain={props.onEqHighGain}
      />
    </TimelineBottomPanelShell>
  )
  const closedFootprint = () => getBottomPanelMountedFootprintPx({ open: false, heightPx: props.heightPx })

  return (
    <Show
      when={props.open}
      fallback={(
        <div
          testId="bottom-panel-closed"
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            left: 0,
            height: closedFootprint(),
            minHeight: closedFootprint(),
            backgroundColor: dawTheme.background,
            paddingBottom: 4,
          }}
        >
          {footer()}
        </div>
      )}
    >
      <Show
        when={props.activeTab === "clip" ? sourceAudioClip() : undefined}
        fallback={effectsPanel()}
      >
        {(clip) => (
          <SampleDetailPanel
            clip={clip()}
            projectBpm={props.projectBpm}
            audioEngine={props.audioEngine}
            bpmDetection={props.bpmDetection}
            ensureClipBuffer={async () => {}}
            canWriteClip={() => true}
            onWarpChange={(source, audioWarp) => props.onClipWarpChange(source.id, audioWarp)}
            onGainChange={(source, gain) => props.onClipGainChange(source.id, gain)}
            shell={{
              get heightPx() { return props.heightPx },
              onHeightPreview: props.onHeightPreview,
              onHeightCommit: props.onHeightCommit,
            }}
            onClose={props.onEffectsTabClick}
            onHide={props.onClose}
          />
        )}
      </Show>
    </Show>
  )
}

export default TimelinePanels
''')

timeline_path = DAW / "src/native/Timeline.tsx"
timeline = timeline_path.read_text()
import_anchor = 'import { createMemo, createSignal, onCleanup, type JSX } from "solid-js"\n'
imports = '''import { createMemo, createSignal, onCleanup, type JSX } from "solid-js"
import { createDeterministicAudioEngine } from "../compat/audio-engine"
import { createBpmDetectionService } from "../compat/bpm-detection-service"
import type { AudioWarp } from "../upstream/packages/timeline-core/types"
import { clampBottomPanelHeight } from "../upstream/lib/bottom-panel-preferences"
'''
if "createDeterministicAudioEngine" not in timeline:
    if import_anchor not in timeline:
        raise SystemExit("Timeline import anchor missing")
    timeline = timeline.replace(import_anchor, imports, 1)

signal_anchor = '''  const [bottomPanelOpen, setBottomPanelOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
'''
signal_replacement = '''  const [bottomPanelOpen, setBottomPanelOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
  const [bottomPanelHeight, setBottomPanelHeight] = createSignal(layout.bottomPanelHeight)
'''
if "setBottomPanelHeight" not in timeline:
    if signal_anchor not in timeline:
        raise SystemExit("bottom panel signal anchor missing")
    timeline = timeline.replace(signal_anchor, signal_replacement, 1)

service_anchor = '''  const [eqHighGain, setEqHighGain] = createSignal(0)

  let pendingDrag: DragState | undefined
'''
service_replacement = '''  const [eqHighGain, setEqHighGain] = createSignal(0)
  const audioEngine = createDeterministicAudioEngine()
  const bpmDetection = createBpmDetectionService()

  let pendingDrag: DragState | undefined
'''
if "const audioEngine = createDeterministicAudioEngine()" not in timeline:
    if service_anchor not in timeline:
        raise SystemExit("fixture service anchor missing")
    timeline = timeline.replace(service_anchor, service_replacement, 1)

offset_old = '''  const bottomPanelOffsetPx = () => getBottomPanelMountedFootprintPx({
    open: bottomPanelOpen(),
    heightPx: layout.bottomPanelHeight,
  })
'''
offset_new = '''  const bottomPanelOffsetPx = () => getBottomPanelMountedFootprintPx({
    open: bottomPanelOpen(),
    heightPx: bottomPanelHeight(),
  })
'''
if offset_old in timeline:
    timeline = timeline.replace(offset_old, offset_new, 1)

update_track_anchor = '''  const updateTrack = (id: string, update: (track: NativeTrack) => NativeTrack): void => {
    setTracks((current) => current.map((track) => track.id === id ? update(track) : track))
  }
'''
update_helpers = '''  const updateTrack = (id: string, update: (track: NativeTrack) => NativeTrack): void => {
    setTracks((current) => current.map((track) => track.id === id ? update(track) : track))
  }

  const updateClip = (id: string, update: (clip: NativeClip) => NativeClip): void => {
    setTracks((current) => current.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => clip.id === id ? update(clip) : clip),
    })))
  }

  const setBottomPanelHeightFromSource = (heightPx: number): void => {
    setBottomPanelHeight(clampBottomPanelHeight(heightPx, window.innerHeight))
  }
'''
if "const updateClip =" not in timeline:
    if update_track_anchor not in timeline:
        raise SystemExit("updateClip insertion anchor missing")
    timeline = timeline.replace(update_track_anchor, update_helpers, 1)

props_old = '''        heightPx={layout.bottomPanelHeight}
        projectBpm={bpm()}
        onOpen={() => setBottomPanelOpen(true)}
        onClose={() => setBottomPanelOpen(false)}
        onEffectsTabClick={() => { setBottomTab("effects"); setBottomPanelOpen(true) }}
        onClipTabClick={() => { if (selectedClip()?.kind === "audio") { setBottomTab("clip"); setBottomPanelOpen(true) } }}
        selectedClip={selectedClip()}
'''
props_new = '''        heightPx={bottomPanelHeight()}
        projectBpm={bpm()}
        onOpen={() => setBottomPanelOpen(true)}
        onClose={() => setBottomPanelOpen(false)}
        onEffectsTabClick={() => { setBottomTab("effects"); setBottomPanelOpen(true) }}
        onClipTabClick={() => { if (selectedClip()?.kind === "audio") { setBottomTab("clip"); setBottomPanelOpen(true) } }}
        onHeightPreview={setBottomPanelHeightFromSource}
        onHeightCommit={setBottomPanelHeightFromSource}
        selectedClip={selectedClip()}
        audioEngine={audioEngine}
        bpmDetection={bpmDetection}
        onClipWarpChange={(clipId: string, audioWarp: AudioWarp) => updateClip(clipId, (clip) => ({ ...clip, audioWarp }))}
        onClipGainChange={(clipId: string, gain: number) => updateClip(clipId, (clip) => ({ ...clip, gain }))}
'''
if "onClipWarpChange=" not in timeline:
    if props_old not in timeline:
        raise SystemExit("TimelinePanels props anchor missing")
    timeline = timeline.replace(props_old, props_new, 1)
timeline_path.write_text(timeline)

test_path = DAW / "src/test.tsx"
test = test_path.read_text()
start_marker = '  requireCondition(app.renderer.hasTestId("clip-panel") && !app.renderer.hasTestId("effects-panel"), "second audio-clip tap should open Sample Detail like upstream")\n'
end_marker = '  app.renderer.clickTextWithinTestId("bottom-panel", "EFFECTS")\n  requireCondition(app.renderer.hasTestId("effects-panel"), "Effects tab should restore devices")\n'
if start_marker not in test or end_marker not in test:
    raise SystemExit("Sample Detail verifier replacement anchors missing")
start = test.index(start_marker)
end = test.index(end_marker, start) + len(end_marker)
new_block = '''  requireCondition(!app.renderer.hasTestId("effects-panel"), "second exact audio-clip tap should replace Effects with Sample Detail")
  requireText(rootText(), "Sample Detail", "exact Sample Detail rail")
  requireText(rootText(), "Drum Loop 01", "exact selected audio sample")
  requireText(rootText(), "Source BPM", "exact sample controls")
  requireText(rootText(), "Beat Grid", "exact SampleDetailWaveform header")

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
  await Promise.resolve()
  app.renderer.flush()
  requireText(rootText(), "Suggested 118.00 BPM, confidence 94%. Applied.", "deterministic BPM service through exact source UI")
  requireCondition(Number(app.renderer.customPropByCustomProps(sourceBpmInput, "value")) === 118, "high-confidence source BPM analysis should auto-apply")
  requireCondition(app.renderer.hasCustomProps({ value: "stretch" }), "high-confidence BPM analysis should switch the exact Mode select to Stretch")

  const gainInput = { type: "range", min: "-60", max: "6.02", step: "0.1" } as const
  const gainBefore = app.renderer.customPropByCustomProps(gainInput, "value")
  app.renderer.dragCustomProps(gainInput, 20, 0)
  const gainAfter = app.renderer.customPropByCustomProps(gainInput, "value")
  requireCondition(gainAfter !== gainBefore, `exact Clip Gain range should update fixture clip state: ${JSON.stringify(gainBefore)} -> ${JSON.stringify(gainAfter)}`)

  app.renderer.clickText("Hide")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "exact Sample Detail footer Hide should close the shared panel")
  app.renderer.clickTextWithinTestId("bottom-panel-closed", "Effects")
  requireCondition(app.renderer.hasTestId("effects-panel"), "closed source footer Effects action should restore devices")
'''
test_path.write_text(test[:start] + new_block + test[end:])
