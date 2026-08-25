import { createMemo, createSignal, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
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

const PIXELS_PER_SECOND = 72

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

function findClip(tracks: NativeTrack[], clipId: string): { track: NativeTrack; clip: NativeClip } | undefined {
  for (const track of tracks) {
    const clip = track.clips.find((entry) => entry.id === clipId)
    if (clip) return { track, clip }
  }
  return undefined
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
  const [gridEnabled, setGridEnabled] = createSignal(true)
  const [gridDenominator, setGridDenominator] = createSignal(16)
  const [midiKeyboardEnabled, setMidiKeyboardEnabled] = createSignal(false)
  const [playheadSec, setPlayheadSec] = createSignal(2.75)
  const [bottomPanelOpen, setBottomPanelOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
  const [drag, setDrag] = createSignal<DragState>()

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

  const selectedClip = createMemo(() => findClip(tracks(), selectedClipId())?.clip)

  const updateTrack = (id: string, update: (track: NativeTrack) => NativeTrack): void => {
    setTracks((current) => current.map((track) => track.id === id ? update(track) : track))
  }

  const selectTrack = (id: string): void => {
    setSelectedTrackId(id)
    setSelectedClipId("")
    setBottomTab("effects")
    setBottomPanelOpen(true)
  }

  const selectClip = (trackId: string, clipId: string): void => {
    setSelectedTrackId(trackId)
    setSelectedClipId(clipId)
  }

  const beginClipDrag = (trackId: string, clipId: string, event: EventPayload): void => {
    if (event.button !== undefined && event.button !== 0) return
    if (event.x === undefined || event.y === undefined) return
    const currentTracks = tracks()
    const sourceTrackIndex = currentTracks.findIndex((track) => track.id === trackId)
    const clip = currentTracks[sourceTrackIndex]?.clips.find((entry) => entry.id === clipId)
    if (!clip || sourceTrackIndex < 0) return
    selectClip(trackId, clipId)
    setDrag({
      clipId,
      sourceTrackId: trackId,
      startTrackIndex: sourceTrackIndex,
      startX: event.x,
      startY: event.y,
      startSec: clip.startSec,
    })
  }

  const moveClipDrag = (event: EventPayload): void => {
    const currentDrag = drag()
    if (!currentDrag || event.x === undefined || event.y === undefined) return
    const currentTracks = tracks()
    const found = findClip(currentTracks, currentDrag.clipId)
    if (!found) return

    const laneDelta = Math.round((event.y - currentDrag.startY) / layout.laneHeight)
    const candidateIndex = Math.round(clamp(currentDrag.startTrackIndex + laneDelta, 0, currentTracks.length - 1))
    const candidate = currentTracks[candidateIndex]
    const source = currentTracks.find((track) => track.id === currentDrag.sourceTrackId)
    if (!source) return
    const target = candidate && compatible(found.clip, candidate) ? candidate : source
    const rawStart = Math.max(0, currentDrag.startSec + (event.x - currentDrag.startX) / PIXELS_PER_SECOND)
    const startSec = gridEnabled() ? quantizeSecToGrid(rawStart, bpm(), gridDenominator()) : rawStart
    const movedClip = { ...found.clip, startSec }

    setTracks((current) => current.map((track) => {
      const without = track.clips.filter((clip) => clip.id !== movedClip.id)
      if (track.id === target.id) return { ...track, clips: [...without, movedClip] }
      return without.length === track.clips.length ? track : { ...track, clips: without }
    }))
    setSelectedTrackId(target.id)
  }

  const cycleGrid = (): void => {
    const current = gridDenominator()
    if (current === 8) setGridDenominator(16)
    else if (current === 16) setGridDenominator(32)
    else setGridDenominator(8)
  }

  return (
    <div testId="daw-showcase" style={{ width: "100%", height: "100%", minWidth: 1180, minHeight: 820, display: "flex", flexDirection: "column", backgroundColor: dawTheme.background, color: dawTheme.foreground, fontFamily: "system-ui", overflow: "hidden" }}>
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
          onChangeGridDenominator: cycleGrid,
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
        pixelsPerSecond={PIXELS_PER_SECOND}
        gridEnabled={gridEnabled()}
        playheadSec={playheadSec()}
        sidebar={{
          onSelectTrack: selectTrack,
          onToggleMute: (id) => updateTrack(id, (track) => ({ ...track, muted: !track.muted })),
          onToggleSolo: (id) => updateTrack(id, (track) => ({ ...track, soloed: !track.soloed })),
          onToggleArm: (id) => updateTrack(id, (track) => ({ ...track, armed: !track.armed })),
          onVolumeChange: (id, value) => updateTrack(id, (track) => ({ ...track, volume: value })),
        }}
        onSelectClip={selectClip}
        onClipMouseDown={beginClipDrag}
        dragging={drag() !== undefined}
        onDragMove={moveClipDrag}
        onDragEnd={() => setDrag(undefined)}
      />

      <TimelinePanels
        open={bottomPanelOpen()}
        activeTab={bottomTab()}
        heightPx={layout.bottomPanelHeight}
        onOpen={() => setBottomPanelOpen(true)}
        onClose={() => setBottomPanelOpen(false)}
        onEffectsTabClick={() => { setBottomTab("effects"); setBottomPanelOpen(true) }}
        onClipTabClick={() => { setBottomTab("clip"); setBottomPanelOpen(true) }}
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
