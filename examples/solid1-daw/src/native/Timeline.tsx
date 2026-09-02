import { createMemo, createSignal, onCleanup, type JSX } from "solid-js"
import { getBottomPanelMountedFootprintPx } from "../upstream/lib/bottom-panel-layout"
import { DEFAULT_PIXELS_PER_SECOND } from "../compat/timeline-view"
import TimelineChrome from "./TimelineChrome"
import TimelinePanels from "./TimelinePanels"
import TimelineWorkspace from "./TimelineWorkspace"
import { initialTracks, type BottomTab, type BrowserTab, type NativeClip, type NativeTrack } from "./model"
import { dawTheme, layout } from "./theme"

interface DragState {
  clipId: string
  sourceTrackId: string
  startTrackIndex: number
  startX: number
  startY: number
  startSec: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function quantizeSecToGrid(sec: number, bpm: number, denominator: number): number {
  const step = (60 / Math.max(1, bpm)) * (4 / Math.max(1, denominator))
  return Math.max(0, Math.round(sec / step) * step)
}

function compatible(clip: NativeClip, track: NativeTrack): boolean {
  if (track.kind === "return" || track.kind === "group") return false
  if (clip.kind === "midi") return track.kind === "midi"
  return track.kind === "audio"
}

function draggableTracks(tracks: NativeTrack[]): NativeTrack[] {
  return tracks.filter((track) => track.kind !== "return" && track.kind !== "group")
}

function findClip(tracks: NativeTrack[], clipId: string): { track: NativeTrack; clip: NativeClip } | undefined {
  for (const track of tracks) {
    const clip = track.clips.find((entry) => entry.id === clipId)
    if (clip) return { track, clip }
  }
  return undefined
}

function nextTarget(current: string, targets: string[]): string {
  if (targets.length === 0) return current
  const currentIndex = targets.indexOf(current)
  return targets[(currentIndex + 1 + targets.length) % targets.length] ?? targets[0] ?? current
}

export default function Timeline(): JSX.Element {
  const [tracks, setTracks] = createSignal<NativeTrack[]>(initialTracks)
  const [selectedTrackId, setSelectedTrackId] = createSignal("synth")
  const [selectedClipId, setSelectedClipId] = createSignal("synth-a")
  const [browserOpen, setBrowserOpen] = createSignal(true)
  const [browserTab, setBrowserTab] = createSignal<BrowserTab>("assets")
  const [browserSearch, setBrowserSearch] = createSignal("")
  const [expandedSections, setExpandedSections] = createSignal<ReadonlySet<string>>(new Set(["project-samples", "factory-library", "audio-effects", "instruments"]))
  const [isRecording, setIsRecording] = createSignal(false)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [bpm, setBpm] = createSignal(120)
  const [metronomeEnabled, setMetronomeEnabled] = createSignal(false)
  const [loopEnabled, setLoopEnabled] = createSignal(false)
  const [loopStartSec, setLoopStartSec] = createSignal(0)
  const [loopEndSec, setLoopEndSec] = createSignal(8)
  const [gridEnabled, setGridEnabled] = createSignal(true)
  const [gridDenominator, setGridDenominator] = createSignal(4)
  const [midiKeyboardEnabled, setMidiKeyboardEnabled] = createSignal(false)
  const [playheadSec, setPlayheadSec] = createSignal(2.75)
  const [bottomPanelOpen, setBottomPanelOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
  const [drag, setDrag] = createSignal<DragState>()
  const [masterVolume, setMasterVolume] = createSignal(1)

  const [compressorEnabled, setCompressorEnabled] = createSignal(true)
  const [compressorRatio, setCompressorRatio] = createSignal(4)
  const [compressorAttack, setCompressorAttack] = createSignal(2)
  const [compressorRelease, setCompressorRelease] = createSignal(120)
  const [compressorThreshold, setCompressorThreshold] = createSignal(-18)
  const [compressorWet, setCompressorWet] = createSignal(1)
  const [eqEnabled, setEqEnabled] = createSignal(true)
  const [eqLowGain, setEqLowGain] = createSignal(-1)
  const [eqMidGain, setEqMidGain] = createSignal(2)
  const [eqHighGain, setEqHighGain] = createSignal(0)

  let pendingDrag: DragState | undefined
  let dragListenersArmed = false

  const selectedClip = createMemo(() => findClip(tracks(), selectedClipId())?.clip)
  const bottomPanelOffsetPx = () => getBottomPanelMountedFootprintPx({
    open: bottomPanelOpen(),
    heightPx: layout.bottomPanelHeight,
  })

  const updateTrack = (id: string, update: (track: NativeTrack) => NativeTrack): void => {
    setTracks((current) => current.map((track) => track.id === id ? update(track) : track))
  }

  const cycleOutputTarget = (id: string): void => {
    const targets = ["Master", ...tracks().filter((track) => track.kind === "group").map((track) => track.name)]
    updateTrack(id, (track) => ({ ...track, outputTarget: nextTarget(track.outputTarget, targets) }))
  }

  const cycleSendTarget = (id: string): void => {
    const targets = ["None", ...tracks().filter((track) => track.kind === "return").map((track) => track.name)]
    updateTrack(id, (track) => ({ ...track, sendTarget: nextTarget(track.sendTarget, targets) }))
  }

  const hideAutomationLane = (id: string): void => {
    updateTrack(id, (track) => track.automationLaneCount > 1
      ? { ...track, automationLaneCount: track.automationLaneCount - 1 }
      : { ...track, automationVisible: false })
  }

  const selectTrack = (id: string): void => {
    setSelectedTrackId(id)
    setSelectedClipId("")
    setBottomTab("effects")
    setBottomPanelOpen(true)
  }

  const selectMaster = (): void => {
    setSelectedTrackId("master")
    setSelectedClipId("")
    setBottomTab("effects")
    setBottomPanelOpen(true)
  }

  const selectClip = (trackId: string, clipId: string): void => {
    const clip = findClip(tracks(), clipId)?.clip
    setSelectedTrackId(trackId)
    setSelectedClipId(clipId)
    if (bottomTab() === "clip" && clip?.kind !== "audio") setBottomTab("effects")
  }

  const openClip = (trackId: string, clipId: string): void => {
    const clip = findClip(tracks(), clipId)?.clip
    selectClip(trackId, clipId)
    if (clip?.kind !== "audio") return
    setBottomTab("clip")
    setBottomPanelOpen(true)
  }

  const moveClipDrag = (x: number, y: number): void => {
    const currentDrag = drag() ?? pendingDrag
    if (!currentDrag) return
    if (drag() === undefined) setDrag(currentDrag)

    const currentTracks = tracks()
    const movableTracks = draggableTracks(currentTracks)
    const found = findClip(currentTracks, currentDrag.clipId)
    if (!found || movableTracks.length === 0) return

    const laneDelta = Math.round((y - currentDrag.startY) / layout.laneHeight)
    const candidateIndex = Math.round(clamp(currentDrag.startTrackIndex + laneDelta, 0, movableTracks.length - 1))
    const candidate = movableTracks[candidateIndex]
    const source = currentTracks.find((track) => track.id === currentDrag.sourceTrackId)
    if (!source) return
    const target = candidate && compatible(found.clip, candidate) ? candidate : source
    const rawStart = Math.max(0, currentDrag.startSec + (x - currentDrag.startX) / DEFAULT_PIXELS_PER_SECOND)
    const startSec = gridEnabled() ? quantizeSecToGrid(rawStart, bpm(), gridDenominator()) : rawStart
    const movedClip = { ...found.clip, startSec }

    setTracks((current) => current.map((track) => {
      const without = track.clips.filter((clip) => clip.id !== movedClip.id)
      if (track.id === target.id) return { ...track, clips: [...without, movedClip] }
      return without.length === track.clips.length ? track : { ...track, clips: without }
    }))
    setSelectedTrackId(target.id)
  }

  const disarmDragListeners = (): void => {
    if (!dragListenersArmed) return
    window.removeEventListener("pointermove", handleWindowPointerMove, true)
    window.removeEventListener("pointerup", handleWindowPointerUp, true)
    window.removeEventListener("pointercancel", handleWindowPointerCancel, true)
    dragListenersArmed = false
  }

  const endClipDrag = (): void => {
    pendingDrag = undefined
    setDrag(undefined)
    disarmDragListeners()
  }

  function handleWindowPointerMove(event: PointerEvent): void {
    moveClipDrag(event.clientX, event.clientY)
  }

  function handleWindowPointerUp(): void {
    endClipDrag()
  }

  function handleWindowPointerCancel(): void {
    endClipDrag()
  }

  const armDragListeners = (): void => {
    if (dragListenersArmed) return
    window.addEventListener("pointermove", handleWindowPointerMove, true)
    window.addEventListener("pointerup", handleWindowPointerUp, true)
    window.addEventListener("pointercancel", handleWindowPointerCancel, true)
    dragListenersArmed = true
  }

  const beginClipDrag = (trackId: string, clipId: string, event: PointerEvent): void => {
    if (event.button !== 0) return
    const currentTracks = tracks()
    const movableTracks = draggableTracks(currentTracks)
    const sourceTrackIndex = movableTracks.findIndex((track) => track.id === trackId)
    const sourceTrack = movableTracks[sourceTrackIndex]
    const clip = sourceTrack?.clips.find((entry) => entry.id === clipId)
    if (!clip || sourceTrackIndex < 0) return

    disarmDragListeners()
    setDrag(undefined)
    pendingDrag = {
      clipId,
      sourceTrackId: trackId,
      startTrackIndex: sourceTrackIndex,
      startX: event.clientX,
      startY: event.clientY,
      startSec: clip.startSec,
    }
    selectClip(trackId, clipId)
    armDragListeners()
  }

  onCleanup(() => {
    pendingDrag = undefined
    disarmDragListeners()
  })

  return (
    <div testId="daw-showcase" style={{ width: "100%", height: "100%", minWidth: 1180, minHeight: 820, display: "flex", flexDirection: "column", position: "relative", backgroundColor: dawTheme.background, color: dawTheme.foreground, fontFamily: "system-ui", overflow: "hidden" }}>
      <TimelineChrome
        transport={{
          browserOpen: browserOpen(),
          onToggleBrowser: () => setBrowserOpen((open) => !open),
          isRecording: isRecording(),
          onToggleRecord: () => setIsRecording((active) => !active),
          isPlaying: isPlaying(),
          onPlay: () => { setIsPlaying(true); setPlayheadSec((value) => value + 0.25) },
          onPause: () => setIsPlaying(false),
          onStop: () => { setIsPlaying(false); setIsRecording(false); setPlayheadSec(0) },
          bpm: bpm(),
          onChangeBpm: setBpm,
          metronomeEnabled: metronomeEnabled(),
          onToggleMetronome: () => setMetronomeEnabled((active) => !active),
          loopEnabled: loopEnabled(),
          onToggleLoop: () => setLoopEnabled((active) => !active),
          gridEnabled: gridEnabled(),
          onToggleGrid: () => setGridEnabled((active) => !active),
          gridDenominator: gridDenominator(),
          onChangeGridDenominator: setGridDenominator,
          midiKeyboardEnabled: midiKeyboardEnabled(),
          onToggleMidiKeyboard: () => setMidiKeyboardEnabled((active) => !active),
          playheadSec: playheadSec(),
        }}
      />

      <TimelineWorkspace
        browser={{
          open: browserOpen(),
          activeTab: browserTab(),
          onSelectTab: (tab) => { setBrowserTab(tab); setBrowserSearch("") },
          searchQuery: browserSearch(),
          onSearchQueryChange: setBrowserSearch,
          expandedSections: expandedSections(),
          onToggleSection: (id) => setExpandedSections((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          }),
          onActivateItem: (id) => {
            if (id === "compressor" || id === "eq-eight" || id === "reverb" || id === "delay") {
              setBottomTab("effects")
              setBottomPanelOpen(true)
            }
          },
        }}
        tracks={tracks()}
        selectedClipId={selectedClipId()}
        selectedTrackId={selectedTrackId()}
        pixelsPerSecond={DEFAULT_PIXELS_PER_SECOND}
        gridEnabled={gridEnabled()}
        playheadSec={playheadSec()}
        bpm={bpm()}
        gridDenominator={gridDenominator()}
        loopEnabled={loopEnabled()}
        loopStartSec={loopStartSec()}
        loopEndSec={loopEndSec()}
        bottomPanelOffsetPx={bottomPanelOffsetPx()}
        onSetLoopRegion={(startSec, endSec) => {
          setLoopStartSec(startSec)
          setLoopEndSec(endSec)
        }}
        onRulerScrub={setPlayheadSec}
        sidebar={{
          masterVolume: masterVolume(),
          onSelectTrack: selectTrack,
          onSelectMaster: selectMaster,
          onToggleCollapsed: (id) => updateTrack(id, (track) => ({ ...track, collapsed: !track.collapsed })),
          onCycleOutputTarget: cycleOutputTarget,
          onCycleSendTarget: cycleSendTarget,
          onToggleMute: (id) => updateTrack(id, (track) => ({ ...track, muted: !track.muted })),
          onToggleSolo: (id) => updateTrack(id, (track) => ({ ...track, soloed: !track.soloed })),
          onToggleArm: (id) => updateTrack(id, (track) => ({ ...track, armed: !track.armed })),
          onVolumeChange: (id, value) => updateTrack(id, (track) => ({ ...track, volume: value })),
          onToggleAutomation: (id) => updateTrack(id, (track) => ({ ...track, automationVisible: !track.automationVisible })),
          onAddAutomationLane: (id) => updateTrack(id, (track) => track.automationVisible && track.automationLaneCount < 3
            ? { ...track, automationLaneCount: track.automationLaneCount + 1 }
            : track),
          onHideAutomationLane: hideAutomationLane,
          onMasterVolumeChange: setMasterVolume,
        }}
        onSelectClip={selectClip}
        onOpenClip={openClip}
        onClipMouseDown={beginClipDrag}
        dragging={drag() !== undefined}
      />

      <TimelinePanels
        open={bottomPanelOpen()}
        activeTab={bottomTab()}
        heightPx={layout.bottomPanelHeight}
        projectBpm={bpm()}
        onOpen={() => setBottomPanelOpen(true)}
        onClose={() => setBottomPanelOpen(false)}
        onEffectsTabClick={() => { setBottomTab("effects"); setBottomPanelOpen(true) }}
        onClipTabClick={() => { if (selectedClip()?.kind === "audio") { setBottomTab("clip"); setBottomPanelOpen(true) } }}
        selectedClip={selectedClip()}
        compressorEnabled={compressorEnabled()}
        onToggleCompressor={() => setCompressorEnabled((enabled) => !enabled)}
        compressorRatio={compressorRatio()}
        onRatioChange={setCompressorRatio}
        compressorAttack={compressorAttack()}
        onAttackChange={setCompressorAttack}
        compressorRelease={compressorRelease()}
        onReleaseChange={setCompressorRelease}
        compressorThreshold={compressorThreshold()}
        onThresholdChange={setCompressorThreshold}
        compressorWet={compressorWet()}
        onWetChange={setCompressorWet}
        eqEnabled={eqEnabled()}
        onToggleEq={() => setEqEnabled((enabled) => !enabled)}
        eqLowGain={eqLowGain()}
        onEqLowGain={setEqLowGain}
        eqMidGain={eqMidGain()}
        onEqMidGain={setEqMidGain}
        eqHighGain={eqHighGain()}
        onEqHighGain={setEqHighGain}
      />
    </div>
  )
}