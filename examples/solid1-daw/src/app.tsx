import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import type { EventPayload, StyleDesc } from "@jhomra21/gpuix-solid1"

type TrackKind = "audio" | "midi"
type BrowserTab = "assets" | "effects" | "midi-instruments"
type BottomTab = "effects" | "clip"

interface DemoTrack {
  id: string
  number: number
  name: string
  kind: TrackKind
  color: string
  volume: number
  pan: number
  send: number
  mute: boolean
  solo: boolean
  armed: boolean
  meter: number
}

interface DemoClip {
  id: string
  kind: TrackKind
  label: string
  durationSec: number
  color: string
}

interface ClipPosition {
  trackId: string
  startSec: number
}

interface BrowserLeaf {
  id: string
  label: string
  subtitle: string
}

interface BrowserSection {
  id: string
  label: string
  children: BrowserLeaf[]
}

interface ClipDragState {
  clipId: string
  startX: number
  startSec: number
}

const BROWSER_WIDTH = 280
const TRACK_SIDEBAR_WIDTH = 336
const ARRANGEMENT_OVERVIEW_HEIGHT = 24
const RULER_HEIGHT = 32
const LANE_HEIGHT = 96
const BOTTOM_PANEL_HEIGHT = 360
const PIXELS_PER_SECOND = 72

// Exact sRGB translations of the pinned DAW branch's dark OKLCH tokens.
const colors = {
  background: "#09090b",
  foreground: "#fafafa",
  muted: "#27272a",
  mutedForeground: "#9f9fa9",
  border: "#27272a",
  appSurface: "#0d0d0f",
  appSurfaceMuted: "#161619",
  timelineBackground: "#040405",
  timelineSurface: "#0d0d0f",
  timelineSurfaceMuted: "#1a1a1d",
  gridMinor: "#19191b",
  gridMajor: "#303034",
  playhead: "#ff6056",
  clipAudio: "#00a76c",
  clipMidi: "#0089ed",
  clipSelected: "#e6ad00",
  meterSafe: "#00a76c",
  meterWarning: "#e6ad00",
  meterClipping: "#f53e39",
  graphBackground: "#040405",
  graphGrid: "#29292c",
  graphAccent: "#00c3db",
  cyan: "#67e8f9",
  red: "#ef4444",
  amber: "#fbbf24",
} as const

const tracks: DemoTrack[] = [
  { id: "drums", number: 1, name: "Drums", kind: "audio", color: "#b96b5b", volume: 0.86, pan: 0, send: 0.08, mute: false, solo: false, armed: false, meter: 0.82 },
  { id: "bass", number: 2, name: "Bass", kind: "audio", color: "#4f8f70", volume: 0.78, pan: 0, send: 0.18, mute: false, solo: false, armed: false, meter: 0.64 },
  { id: "synth", number: 3, name: "Synth", kind: "midi", color: "#557bc2", volume: 0.72, pan: -12, send: 0.34, mute: false, solo: false, armed: true, meter: 0.55 },
  { id: "vocals", number: 4, name: "Vocals", kind: "audio", color: "#8567aa", volume: 0.8, pan: 6, send: 0.24, mute: false, solo: false, armed: false, meter: 0.69 },
]

const clipDefinitions: DemoClip[] = [
  { id: "drums-a", kind: "audio", label: "Drum Loop 01", durationSec: 2.7, color: colors.clipAudio },
  { id: "drums-b", kind: "audio", label: "Drum Loop 02", durationSec: 2.45, color: colors.clipAudio },
  { id: "bass-a", kind: "audio", label: "Bass Verse", durationSec: 3.4, color: "#4f8f70" },
  { id: "synth-a", kind: "midi", label: "MIDI · Glass Pad", durationSec: 4.2, color: colors.clipMidi },
  { id: "vocals-a", kind: "audio", label: "Lead Vocal", durationSec: 2.15, color: "#8567aa" },
  { id: "vocals-b", kind: "audio", label: "Hook Comp", durationSec: 2.55, color: "#8567aa" },
]

const initialClipPositions: Record<string, ClipPosition> = {
  "drums-a": { trackId: "drums", startSec: 0.6 },
  "drums-b": { trackId: "drums", startSec: 3.7 },
  "bass-a": { trackId: "bass", startSec: 1.25 },
  "synth-a": { trackId: "synth", startSec: 2.15 },
  "vocals-a": { trackId: "vocals", startSec: 0.8 },
  "vocals-b": { trackId: "vocals", startSec: 4.35 },
}

const browserData: Record<BrowserTab, BrowserSection[]> = {
  assets: [
    { id: "project-samples", label: "PROJECT SAMPLES", children: [
      { id: "kick-tight", label: "Kick · Tight 04", subtitle: "One-shot" },
      { id: "hat-dry", label: "Hi-Hat · Dry 12", subtitle: "One-shot" },
      { id: "vocal-air", label: "Vocal Air 118", subtitle: "Loop" },
    ] },
    { id: "factory-library", label: "FACTORY LIBRARY", children: [
      { id: "glass-hit", label: "Glass Hit", subtitle: "One-shot" },
      { id: "room-tone", label: "Room Tone", subtitle: "Texture" },
    ] },
  ],
  effects: [
    { id: "dynamics", label: "DYNAMICS", children: [
      { id: "compressor", label: "Compressor", subtitle: "Audio Effect" },
      { id: "gate", label: "Gate", subtitle: "Audio Effect" },
    ] },
    { id: "eq-filters", label: "EQ & FILTERS", children: [
      { id: "eq", label: "EQ Eight", subtitle: "Audio Effect" },
      { id: "autofilter", label: "Auto Filter", subtitle: "Audio Effect" },
    ] },
    { id: "space", label: "SPACE", children: [
      { id: "reverb", label: "Reverb", subtitle: "Audio Effect" },
      { id: "delay", label: "Delay", subtitle: "Audio Effect" },
    ] },
  ],
  "midi-instruments": [
    { id: "instruments", label: "INSTRUMENTS", children: [
      { id: "analog", label: "Analog", subtitle: "Instrument" },
      { id: "wavetable", label: "Wavetable", subtitle: "Instrument" },
    ] },
    { id: "presets", label: "PRESETS", children: [
      { id: "round-bass", label: "Round Analog Bass", subtitle: "Analog" },
      { id: "glass-pad", label: "Glass Pad", subtitle: "Wavetable" },
    ] },
  ],
}

const browserTabLabels: Record<BrowserTab, string> = {
  assets: "Assets",
  effects: "Effects",
  "midi-instruments": "MIDI Instruments",
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function signed(value: number, suffix = ""): string {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${roundTenths(value)}${suffix}`
}

function quantizeSecToGrid(sec: number, bpm: number, denominator: number): number {
  const step = (60 / Math.max(1, bpm)) * (4 / Math.max(1, denominator))
  return Math.max(0, Math.round(sec / step) * step)
}

function ghostButtonStyle(active = false, danger = false): StyleDesc {
  return {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: active ? (danger ? "#ef4444" : colors.timelineSurfaceMuted) : colors.timelineBackground,
    color: active && danger ? colors.background : colors.mutedForeground,
    cursor: "pointer",
    hover: { backgroundColor: colors.timelineSurfaceMuted, color: colors.foreground },
    active: { opacity: 0.78 },
  }
}

function compactButtonStyle(active = false): StyleDesc {
  return {
    minHeight: 24,
    paddingLeft: 7,
    paddingRight: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: active ? colors.timelineSurfaceMuted : colors.timelineBackground,
    color: active ? colors.foreground : colors.mutedForeground,
    borderWidth: 1,
    borderColor: active ? "#3f3f46" : colors.border,
    borderRadius: 3,
    cursor: "pointer",
    hover: { backgroundColor: colors.timelineSurfaceMuted, color: colors.foreground },
  }
}

interface ToggleButtonProps {
  testId: string
  label: string
  active: boolean
  onClick: () => void
}

function ToggleButton(props: ToggleButtonProps): JSX.Element {
  return (
    <div testId={props.testId} onClick={props.onClick} style={compactButtonStyle(props.active)}>
      <text style={{ color: props.active ? colors.foreground : colors.mutedForeground, fontSize: 9, fontWeight: 650 }}>{props.label}</text>
    </div>
  )
}

interface KnobProps {
  testId: string
  label: string
  value: string
  active?: boolean
  onDecrease: () => void
  onIncrease: () => void
}

function Knob(props: KnobProps): JSX.Element {
  return (
    <div style={{ width: 72, minWidth: 72, alignItems: "center", gap: 4 }}>
      <text style={{ color: colors.mutedForeground, fontSize: 8 }}>{props.label}</text>
      <div style={{ position: "relative", width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: props.active === false ? colors.border : "#52525b", backgroundColor: colors.timelineSurface, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 3, width: 3, height: 8, borderRadius: 2, backgroundColor: props.active === false ? colors.mutedForeground : colors.cyan }} />
        <text style={{ color: colors.foreground, fontFamily: "monospace", fontSize: 8 }}>{props.value}</text>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        <div testId={`${props.testId}-minus`} onClick={props.onDecrease} style={{ ...compactButtonStyle(), minHeight: 18, paddingLeft: 5, paddingRight: 5 }}><text style={{ color: colors.mutedForeground, fontSize: 9 }}>−</text></div>
        <div testId={`${props.testId}-plus`} onClick={props.onIncrease} style={{ ...compactButtonStyle(), minHeight: 18, paddingLeft: 5, paddingRight: 5 }}><text style={{ color: colors.mutedForeground, fontSize: 9 }}>+</text></div>
      </div>
      <text testId={`${props.testId}-value`} style={{ color: colors.mutedForeground, fontFamily: "monospace", fontSize: 8 }}>{props.value}</text>
    </div>
  )
}

function canPlaceClipOnTrack(clip: DemoClip, track: DemoTrack): boolean {
  return clip.kind === track.kind
}

export function DawSolid1Showcase(): JSX.Element {
  const [trackState, setTrackState] = createSignal<DemoTrack[]>(tracks)
  const [clipPositions, setClipPositions] = createSignal<Record<string, ClipPosition>>(initialClipPositions)
  const [selectedTrackId, setSelectedTrackId] = createSignal("synth")
  const [selectedClipId, setSelectedClipId] = createSignal("synth-a")
  const [browserOpen, setBrowserOpen] = createSignal(true)
  const [browserTab, setBrowserTab] = createSignal<BrowserTab>("assets")
  const [browserSearch, setBrowserSearch] = createSignal("")
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [isRecording, setIsRecording] = createSignal(false)
  const [bpm, setBpm] = createSignal(120)
  const [metronome, setMetronome] = createSignal(false)
  const [loop, setLoop] = createSignal(true)
  const [grid, setGrid] = createSignal(true)
  const [gridDenominator, setGridDenominator] = createSignal(16)
  const [drag, setDrag] = createSignal<ClipDragState>()
  const [bottomPanelOpen, setBottomPanelOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
  const [compressorEnabled, setCompressorEnabled] = createSignal(true)
  const [compressorThreshold, setCompressorThreshold] = createSignal(-18)
  const [compressorRatio, setCompressorRatio] = createSignal(4)
  const [compressorAttack, setCompressorAttack] = createSignal(12)
  const [compressorRelease, setCompressorRelease] = createSignal(120)
  const [compressorWet, setCompressorWet] = createSignal(1)
  const [eqEnabled, setEqEnabled] = createSignal(true)
  const [eqLowGain, setEqLowGain] = createSignal(-1)
  const [eqMidGain, setEqMidGain] = createSignal(2)
  const [eqHighGain, setEqHighGain] = createSignal(0)

  const selectedTrack = createMemo(() => trackState().find((track) => track.id === selectedTrackId()) ?? trackState()[0]!)
  const selectedClip = createMemo(() => clipDefinitions.find((clip) => clip.id === selectedClipId()))
  const selectedClipPosition = createMemo(() => clipPositions()[selectedClipId()])
  const visibleBrowserSections = createMemo(() => {
    const query = browserSearch().trim().toLowerCase()
    return browserData[browserTab()].flatMap((section) => {
      if (!query) return [section]
      const children = section.children.filter((item) => item.label.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query))
      return children.length > 0 ? [{ ...section, children }] : []
    })
  })

  const updateTrack = (trackId: string, updates: Partial<DemoTrack>): void => {
    setTrackState((current) => current.map((track) => track.id === trackId ? { ...track, ...updates } : track))
  }

  const cycleGrid = (): void => {
    const current = gridDenominator()
    if (current === 8) setGridDenominator(16)
    else if (current === 16) setGridDenominator(32)
    else setGridDenominator(8)
  }

  const clipsForTrack = (trackId: string): DemoClip[] => {
    const positions = clipPositions()
    return clipDefinitions.filter((clip) => positions[clip.id]?.trackId === trackId)
  }

  const beginClipDrag = (clip: DemoClip, event: EventPayload): void => {
    if (event.button !== undefined && event.button !== 0) return
    const position = clipPositions()[clip.id]
    if (!position || event.x === undefined) return
    setSelectedClipId(clip.id)
    setSelectedTrackId(position.trackId)
    setDrag({ clipId: clip.id, startX: event.x, startSec: position.startSec })
  }

  const moveClipDrag = (targetTrackId: string, event: EventPayload): void => {
    const currentDrag = drag()
    if (!currentDrag || event.x === undefined) return
    const clip = clipDefinitions.find((entry) => entry.id === currentDrag.clipId)
    const targetTrack = trackState().find((track) => track.id === targetTrackId)
    if (!clip || !targetTrack || !canPlaceClipOnTrack(clip, targetTrack)) return

    const rawStart = Math.max(0, currentDrag.startSec + (event.x - currentDrag.startX) / PIXELS_PER_SECOND)
    const nextStart = grid() ? quantizeSecToGrid(rawStart, bpm(), gridDenominator()) : rawStart
    setClipPositions((current) => ({
      ...current,
      [clip.id]: { trackId: targetTrack.id, startSec: nextStart },
    }))
    setSelectedTrackId(targetTrack.id)
  }

  const finishClipDrag = (): void => {
    if (drag()) setDrag(undefined)
  }

  const selectClip = (clip: DemoClip): void => {
    const position = clipPositions()[clip.id]
    if (!position) return
    setSelectedClipId(clip.id)
    setSelectedTrackId(position.trackId)
  }

  return (
    <div testId="daw-showcase" style={{ width: "100%", height: "100%", minWidth: 1180, minHeight: 820, backgroundColor: colors.background, color: colors.foreground, fontFamily: "system-ui", overflow: "hidden" }}>
      <div testId="transport" style={{ height: 44, minHeight: 44, display: "flex", alignItems: "center", paddingLeft: 8, paddingRight: 8, backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border }}>
        <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 4 }}>
          <div testId="browser-toggle" onClick={() => setBrowserOpen((open) => !open)} style={ghostButtonStyle(browserOpen())}>
            <text style={{ color: browserOpen() ? colors.foreground : colors.mutedForeground, fontSize: 13 }}>▤</text>
          </div>
          <For each={["File", "Edit", "View", "Settings", "Tracks"]}>
            {(menu) => <div style={{ minHeight: 28, paddingLeft: 7, paddingRight: 7, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: colors.timelineSurfaceMuted } }}><text style={{ color: colors.mutedForeground, fontSize: 10 }}>{menu}</text></div>}
          </For>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div testId="transport-record" onClick={() => setIsRecording((active) => !active)} style={ghostButtonStyle(isRecording(), true)}><text style={{ color: isRecording() ? colors.background : colors.red, fontSize: 14 }}>●</text></div>
          <div testId="transport-play" onClick={() => setIsPlaying((playing) => !playing)} style={ghostButtonStyle()}><text style={{ color: colors.mutedForeground, fontSize: 12 }}>{isPlaying() ? "Ⅱ" : "▶"}</text></div>
          <div testId="transport-stop" onClick={() => { setIsPlaying(false); setIsRecording(false) }} style={ghostButtonStyle()}><text style={{ color: colors.mutedForeground, fontSize: 11 }}>■</text></div>
          <div style={{ display: "flex", alignItems: "center", marginLeft: 3 }}>
            <input
              testId="bpm-input"
              value={String(bpm())}
              onChange={(event: EventPayload) => {
                const next = Number(event.value ?? "")
                if (Number.isFinite(next)) setBpm(Math.round(clamp(next, 40, 240)))
              }}
              style={{ width: 52, height: 27, paddingLeft: 7, paddingRight: 7, backgroundColor: colors.timelineSurface, color: colors.foreground, borderWidth: 1, borderColor: colors.border, fontFamily: "monospace", fontSize: 10 }}
            />
            <text style={{ marginLeft: 4, marginRight: 4, color: colors.mutedForeground, fontSize: 9 }}>BPM</text>
            <div testId="metronome-toggle" onClick={() => setMetronome((active) => !active)} style={ghostButtonStyle(metronome())}><text style={{ color: metronome() ? colors.foreground : colors.mutedForeground, fontSize: 11 }}>⌁</text></div>
            <div testId="loop-toggle" onClick={() => setLoop((active) => !active)} style={ghostButtonStyle(loop())}><text style={{ color: loop() ? "#4ade80" : colors.mutedForeground, fontSize: 13 }}>↻</text></div>
            <div testId="grid-toggle" onClick={() => setGrid((active) => !active)} style={ghostButtonStyle(grid())}><text style={{ color: grid() ? "#4ade80" : colors.mutedForeground, fontSize: 12 }}>▦</text></div>
            <div testId="grid-resolution" onClick={cycleGrid} style={{ ...compactButtonStyle(grid()), minHeight: 28, marginLeft: 2 }}><text style={{ color: colors.foreground, fontSize: 9 }}>{`1/${gridDenominator()}`}</text></div>
          </div>
        </div>

        <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <text testId="transport-state" style={{ color: isRecording() ? colors.red : isPlaying() ? "#4ade80" : colors.mutedForeground, fontSize: 9 }}>{isRecording() ? "Recording" : isPlaying() ? "Playing" : "Stopped"}</text>
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" }} />
          <text style={{ color: colors.mutedForeground, fontSize: 9 }}>Local</text>
        </div>
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
        <Show when={browserOpen()}>
          <div testId="browser-sidebar" style={{ width: BROWSER_WIDTH, minWidth: BROWSER_WIDTH, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
            <div style={{ padding: 8, gap: 4, borderWidth: 1, borderColor: colors.border }}>
              <For each={["assets", "effects", "midi-instruments"] as BrowserTab[]}>
                {(tab) => (
                  <div testId={`browser-tab-${tab}`} onClick={() => { setBrowserTab(tab); setBrowserSearch("") }} style={{ height: 26, paddingLeft: 8, paddingRight: 8, justifyContent: "center", backgroundColor: browserTab() === tab ? colors.appSurfaceMuted : colors.background, cursor: "pointer", hover: { backgroundColor: colors.appSurfaceMuted } }}>
                    <text style={{ color: browserTab() === tab ? colors.foreground : colors.mutedForeground, fontSize: 10 }}>{browserTabLabels[tab]}</text>
                  </div>
                )}
              </For>
            </div>
            <input
              testId="browser-search"
              value={browserSearch()}
              placeholder={`Search ${browserTabLabels[browserTab()].toLowerCase()}`}
              onChange={(event: EventPayload) => setBrowserSearch(event.value ?? "")}
              style={{ width: "100%", height: 36, paddingLeft: 12, paddingRight: 12, backgroundColor: colors.background, color: colors.foreground, borderWidth: 1, borderColor: colors.border, fontSize: 10 }}
            />
            <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto", paddingTop: 4, paddingBottom: 6 }}>
              <For each={visibleBrowserSections()}>
                {(section) => (
                  <div style={{ gap: 1 }}>
                    <div style={{ height: 24, display: "flex", alignItems: "center", paddingLeft: 6, paddingRight: 6 }}>
                      <text style={{ width: 14, color: colors.mutedForeground, fontSize: 9 }}>▾</text>
                      <text style={{ flexGrow: 1, color: colors.mutedForeground, fontSize: 9, fontWeight: 700 }}>{section.label}</text>
                      <text style={{ color: colors.mutedForeground, fontSize: 8 }}>{section.children.length}</text>
                    </div>
                    <For each={section.children}>
                      {(item) => (
                        <div
                          testId={`browser-result-${item.id}`}
                          onClick={() => {
                            if (browserTab() === "effects") {
                              setBottomPanelOpen(true)
                              setBottomTab("effects")
                            }
                          }}
                          style={{ height: 24, paddingLeft: 20, paddingRight: 8, display: "flex", alignItems: "center", cursor: "pointer", hover: { backgroundColor: colors.appSurfaceMuted } }}
                        >
                          <text style={{ flexGrow: 1, color: colors.foreground, fontSize: 10, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.label}</text>
                          <text style={{ color: colors.mutedForeground, fontSize: 8 }}>{item.subtitle}</text>
                        </div>
                      )}
                    </For>
                  </div>
                )}
              </For>
              <Show when={visibleBrowserSections().length === 0}>
                <div style={{ margin: 8, padding: 10, borderWidth: 1, borderColor: colors.border }}><text style={{ color: colors.mutedForeground, fontSize: 9 }}>No results match this search.</text></div>
              </Show>
            </div>
          </div>
        </Show>

        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, overflow: "hidden", backgroundColor: colors.timelineBackground }}>
          <div style={{ height: ARRANGEMENT_OVERVIEW_HEIGHT, minHeight: ARRANGEMENT_OVERVIEW_HEIGHT, display: "flex" }}>
            <div style={{ width: TRACK_SIDEBAR_WIDTH, minWidth: TRACK_SIDEBAR_WIDTH, backgroundColor: colors.timelineSurface, borderWidth: 1, borderColor: colors.border, paddingLeft: 10, justifyContent: "center" }}><text style={{ color: colors.mutedForeground, fontSize: 8 }}>ARRANGEMENT</text></div>
            <div style={{ flexGrow: 1, position: "relative", backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
              <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}>{(bar) => <div style={{ position: "absolute", left: bar * 86, top: bar % 3 === 0 ? 5 : 10, width: bar % 3 === 0 ? 64 : 42, height: bar % 3 === 0 ? 5 : 3, backgroundColor: bar % 3 === 0 ? colors.timelineSurfaceMuted : colors.gridMajor, borderRadius: 2 }} />}</For>
            </div>
          </div>
          <div style={{ height: RULER_HEIGHT, minHeight: RULER_HEIGHT, display: "flex" }}>
            <div testId="track-sidebar-header" style={{ width: TRACK_SIDEBAR_WIDTH, minWidth: TRACK_SIDEBAR_WIDTH, display: "flex", alignItems: "center", paddingLeft: 10, paddingRight: 8, backgroundColor: colors.timelineSurface, borderWidth: 1, borderColor: colors.border }}>
              <text style={{ flexGrow: 1, color: colors.mutedForeground, fontSize: 8, fontWeight: 700 }}>TRACKS</text>
              <text style={{ color: colors.mutedForeground, fontSize: 8 }}>MIXER</text>
            </div>
            <div style={{ flexGrow: 1, position: "relative", backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
              <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}>
                {(bar) => (
                  <div style={{ position: "absolute", left: (bar - 1) * 144, top: 0, width: 1, height: RULER_HEIGHT, backgroundColor: colors.gridMajor }}>
                    <text style={{ marginLeft: 5, marginTop: 5, color: colors.mutedForeground, fontSize: 8 }}>{bar}</text>
                  </div>
                )}
              </For>
              <div style={{ position: "absolute", left: 198, top: 0, width: 1, height: RULER_HEIGHT, backgroundColor: colors.playhead }} />
            </div>
          </div>

          <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
            <For each={trackState()}>
              {(track) => (
                <div style={{ height: LANE_HEIGHT, minHeight: LANE_HEIGHT, display: "flex" }}>
                  <div
                    testId={`track-sidebar-${track.id}`}
                    onClick={() => setSelectedTrackId(track.id)}
                    style={{ width: TRACK_SIDEBAR_WIDTH, minWidth: TRACK_SIDEBAR_WIDTH, height: LANE_HEIGHT, display: "flex", alignItems: "stretch", backgroundColor: selectedTrackId() === track.id ? colors.timelineSurfaceMuted : colors.timelineSurface, borderWidth: 1, borderColor: colors.border, cursor: "pointer", hover: { backgroundColor: colors.timelineSurfaceMuted } }}
                  >
                    <div style={{ width: 4, minWidth: 4, height: LANE_HEIGHT - 1, backgroundColor: track.color }} />
                    <div style={{ width: 42, minWidth: 42, alignItems: "center", justifyContent: "center" }}>
                      <text style={{ color: colors.mutedForeground, fontSize: 9 }}>{track.number}</text>
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0, paddingTop: 9, paddingBottom: 8, paddingRight: 7, gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <text style={{ flexGrow: 1, color: colors.foreground, fontSize: 11, fontWeight: 650, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{track.name}</text>
                        <text style={{ color: colors.mutedForeground, fontSize: 8 }}>{track.kind === "midi" ? "MIDI" : "Audio"}</text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <ToggleButton testId={`track-${track.id}-mute`} label="M" active={track.mute} onClick={() => updateTrack(track.id, { mute: !track.mute })} />
                        <ToggleButton testId={`track-${track.id}-solo`} label="S" active={track.solo} onClick={() => updateTrack(track.id, { solo: !track.solo })} />
                        <ToggleButton testId={`track-${track.id}-arm`} label="●" active={track.armed} onClick={() => updateTrack(track.id, { armed: !track.armed })} />
                        <div style={{ flexGrow: 1, height: 8, position: "relative", backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border }}>
                          <div style={{ width: `${Math.round(track.volume * 100)}%`, height: 6, backgroundColor: colors.mutedForeground }} />
                        </div>
                        <text style={{ width: 30, color: colors.mutedForeground, fontFamily: "monospace", fontSize: 8 }}>{percent(track.volume)}</text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <text style={{ color: colors.mutedForeground, fontSize: 8 }}>Pan {track.pan === 0 ? "C" : track.pan < 0 ? `${Math.abs(track.pan)}L` : `${track.pan}R`}</text>
                        <text style={{ color: colors.mutedForeground, fontSize: 8 }}>Send A {percent(track.send)}</text>
                        <div style={{ flexGrow: 1 }} />
                        <div style={{ width: 46, height: 5, backgroundColor: colors.timelineBackground, borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${Math.round((isPlaying() ? track.meter : track.meter * 0.25) * 100)}%`, height: 5, backgroundColor: track.meter > 0.76 ? colors.meterWarning : colors.meterSafe }} /></div>
                      </div>
                    </div>
                  </div>

                  <div
                    testId={`timeline-lane-${track.id}`}
                    onMouseMove={(event: EventPayload) => moveClipDrag(track.id, event)}
                    onMouseUp={finishClipDrag}
                    style={{ flexGrow: 1, height: LANE_HEIGHT, position: "relative", overflow: "hidden", backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border }}
                  >
                    <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}>
                      {(line) => <div style={{ position: "absolute", left: line * 72, top: 0, width: 1, height: LANE_HEIGHT, backgroundColor: line % 2 === 0 ? colors.gridMajor : colors.gridMinor }} />}
                    </For>
                    <For each={clipsForTrack(track.id)}>
                      {(clip) => {
                        const position = () => clipPositions()[clip.id] ?? { trackId: track.id, startSec: 0 }
                        const selected = () => selectedClipId() === clip.id
                        const dragging = () => drag()?.clipId === clip.id
                        return (
                          <div
                            testId={`clip-${clip.id}`}
                            onClick={() => selectClip(clip)}
                            onMouseDown={(event: EventPayload) => beginClipDrag(clip, event)}
                            onMouseMove={(event: EventPayload) => moveClipDrag(track.id, event)}
                            onMouseUp={finishClipDrag}
                            style={{ position: "absolute", left: position().startSec * PIXELS_PER_SECOND, top: 8, width: clip.durationSec * PIXELS_PER_SECOND, height: 80, paddingTop: 7, paddingLeft: 8, paddingRight: 8, backgroundColor: clip.color, borderWidth: selected() ? 2 : 1, borderColor: selected() ? colors.clipSelected : "#ffffff33", borderRadius: 2, cursor: dragging() ? "grabbing" : "grab", opacity: dragging() ? 0.88 : 1 }}
                          >
                            <text style={{ color: colors.foreground, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{clip.label}</text>
                            <div style={{ marginTop: 7, height: 38, display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
                              <For each={[8, 18, 11, 24, 15, 29, 9, 21, 13, 27, 17, 23, 10, 19, 14, 25, 12, 20]}>{(height) => <div style={{ width: 3, minWidth: 3, height, backgroundColor: "#ffffff77", borderRadius: 1 }} />}</For>
                            </div>
                            <text testId={`clip-${clip.id}-position`} style={{ marginTop: 4, color: "#ffffffbb", fontFamily: "monospace", fontSize: 7 }}>{`${roundTenths(position().startSec)}s`}</text>
                          </div>
                        )
                      }}
                    </For>
                    <div style={{ position: "absolute", left: 198, top: 0, width: 1, height: LANE_HEIGHT, backgroundColor: colors.playhead }} />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      <Show
        when={bottomPanelOpen()}
        fallback={(
          <div testId="bottom-panel-closed" style={{ height: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 9, paddingRight: 9, backgroundColor: colors.appSurface, borderWidth: 1, borderColor: colors.border }}>
            <text style={{ color: colors.mutedForeground, fontSize: 9 }}>{`Effects · ${selectedTrack().name}`}</text>
            <div testId="bottom-panel-open" onClick={() => setBottomPanelOpen(true)} style={compactButtonStyle()}><text style={{ color: colors.mutedForeground, fontSize: 9 }}>Show</text></div>
          </div>
        )}
      >
        <div testId="bottom-panel" style={{ height: BOTTOM_PANEL_HEIGHT, minHeight: BOTTOM_PANEL_HEIGHT, flexShrink: 0, backgroundColor: colors.appSurface, borderWidth: 1, borderColor: colors.border }}>
          <div testId="bottom-resize-handle" style={{ height: 8, minHeight: 8, backgroundColor: colors.appSurface, cursor: "ns-resize", hover: { backgroundColor: "#0c4a5a" } }} />
          <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.appSurface }}>
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <div testId="bottom-tab-effects" onClick={() => setBottomTab("effects")} style={compactButtonStyle(bottomTab() === "effects")}><text style={{ color: bottomTab() === "effects" ? colors.foreground : colors.mutedForeground, fontSize: 9 }}>Effects</text></div>
              <div testId="bottom-tab-clip" onClick={() => setBottomTab("clip")} style={compactButtonStyle(bottomTab() === "clip")}><text style={{ color: bottomTab() === "clip" ? colors.foreground : colors.mutedForeground, fontSize: 9 }}>Clip</text></div>
              <text testId="selected-track-name" style={{ marginLeft: 8, color: colors.mutedForeground, fontSize: 9 }}>{selectedTrack().name}</text>
            </div>
            <div testId="bottom-panel-close" onClick={() => setBottomPanelOpen(false)} style={compactButtonStyle()}><text style={{ color: colors.mutedForeground, fontSize: 9 }}>Hide</text></div>
          </div>

          <Show
            when={bottomTab() === "effects"}
            fallback={(
              <div testId="clip-panel" style={{ flexGrow: 1, minHeight: 0, display: "flex", padding: 10, gap: 8 }}>
                <div style={{ width: 310, minWidth: 310, height: "100%", padding: 12, gap: 8, backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border }}>
                  <text style={{ color: colors.mutedForeground, fontSize: 8, fontWeight: 700 }}>CLIP</text>
                  <text style={{ color: colors.foreground, fontSize: 14, fontWeight: 700 }}>{selectedClip()?.label ?? "No clip selected"}</text>
                  <text style={{ color: colors.mutedForeground, fontSize: 9 }}>{`Start ${roundTenths(selectedClipPosition()?.startSec ?? 0)}s · Warp Complex Pro`}</text>
                </div>
                <div style={{ flexGrow: 1, height: "100%", padding: 12, gap: 8, backgroundColor: colors.timelineBackground, borderWidth: 1, borderColor: colors.border }}>
                  <text style={{ color: colors.mutedForeground, fontSize: 8, fontWeight: 700 }}>SAMPLE</text>
                  <div style={{ flexGrow: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
                    <For each={[18, 32, 11, 40, 24, 47, 15, 35, 22, 45, 19, 39, 28, 46, 16, 30, 21, 42, 25, 37, 14, 34, 20, 41, 23, 36, 17, 31]}>{(height) => <div style={{ width: 5, minWidth: 5, height, backgroundColor: colors.mutedForeground }} />}</For>
                  </div>
                </div>
              </div>
            )}
          >
            <div testId="effects-panel" style={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 8, padding: 8, overflowX: "auto" }}>
              <div testId="compressor-device" style={{ width: 560, minWidth: 560, height: "100%", backgroundColor: colors.appSurface, borderWidth: 1, borderColor: colors.border, opacity: compressorEnabled() ? 1 : 0.7 }}>
                <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "center", paddingLeft: 8, borderWidth: 1, borderColor: colors.border }}>
                  <text style={{ color: colors.foreground, fontSize: 10, fontWeight: 700 }}>Compressor</text>
                  <text style={{ marginLeft: 8, color: colors.mutedForeground, fontSize: 8 }}>Audio</text>
                  <div style={{ flexGrow: 1 }} />
                  <div testId="compressor-enabled" onClick={() => setCompressorEnabled((enabled) => !enabled)} style={{ width: 38, height: 29, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: compressorEnabled() ? "#083344" : colors.appSurface, cursor: "pointer" }}><text style={{ color: compressorEnabled() ? colors.cyan : colors.mutedForeground, fontSize: 9 }}>{compressorEnabled() ? "On" : "Off"}</text></div>
                </div>
                <div style={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 8, padding: 10 }}>
                  <div style={{ width: 84, minWidth: 84, gap: 7, alignItems: "center" }}>
                    <Knob testId="compressor-ratio" label="Ratio" value={`${compressorRatio()}:1`} active={compressorEnabled()} onDecrease={() => setCompressorRatio((value) => clamp(value - 1, 1, 20))} onIncrease={() => setCompressorRatio((value) => clamp(value + 1, 1, 20))} />
                    <Knob testId="compressor-attack" label="Attack" value={`${compressorAttack()} ms`} active={compressorEnabled()} onDecrease={() => setCompressorAttack((value) => clamp(value - 2, 0, 100))} onIncrease={() => setCompressorAttack((value) => clamp(value + 2, 0, 100))} />
                    <Knob testId="compressor-release" label="Release" value={`${compressorRelease()} ms`} active={compressorEnabled()} onDecrease={() => setCompressorRelease((value) => clamp(value - 10, 20, 800))} onIncrease={() => setCompressorRelease((value) => clamp(value + 10, 20, 800))} />
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0, gap: 7 }}>
                    <div style={{ height: 34, display: "flex", gap: 4 }}>
                      <For each={[{ label: "THRESH", value: `${compressorThreshold()} dB`, color: colors.cyan }, { label: "GR", value: "−3.8 dB", color: colors.amber }, { label: "OUTPUT", value: "−7.2 dB", color: colors.foreground }, { label: "OUT", value: "0.0 dB", color: colors.foreground }]}>
                        {(status) => <div style={{ flexGrow: 1, minWidth: 0, paddingLeft: 5, paddingRight: 5, justifyContent: "center", backgroundColor: "#09090bcc", borderWidth: 1, borderColor: colors.border }}><text style={{ color: colors.mutedForeground, fontSize: 7 }}>{status.label}</text><text style={{ color: status.color, fontFamily: "monospace", fontSize: 8 }}>{status.value}</text></div>}
                      </For>
                    </div>
                    <div style={{ flexGrow: 1, minHeight: 0, position: "relative", backgroundColor: colors.graphBackground, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                      <For each={[1, 2, 3, 4, 5, 6, 7, 8]}>{(line) => <div style={{ position: "absolute", left: line * 38, top: 0, width: 1, height: 150, backgroundColor: colors.graphGrid }} />}</For>
                      <For each={[1, 2, 3, 4, 5]}>{(line) => <div style={{ position: "absolute", left: 0, top: line * 27, width: "100%", height: 1, backgroundColor: colors.graphGrid }} />}</For>
                      <div style={{ position: "absolute", left: 12, bottom: 26, width: "82%", height: 2, backgroundColor: colors.graphAccent }} />
                      <div style={{ position: "absolute", left: 145, top: 0, width: 1, height: "100%", backgroundColor: colors.cyan }} />
                    </div>
                    <div style={{ height: 76, display: "flex", justifyContent: "center", gap: 8 }}>
                      <Knob testId="compressor-threshold" label="Thresh" value={`${compressorThreshold()} dB`} active={compressorEnabled()} onDecrease={() => setCompressorThreshold((value) => clamp(value - 1, -60, 0))} onIncrease={() => setCompressorThreshold((value) => clamp(value + 1, -60, 0))} />
                      <Knob testId="compressor-wet" label="Dry/Wet" value={percent(compressorWet())} active={compressorEnabled()} onDecrease={() => setCompressorWet((value) => roundTenths(clamp(value - 0.1, 0, 1)))} onIncrease={() => setCompressorWet((value) => roundTenths(clamp(value + 0.1, 0, 1)))} />
                    </div>
                  </div>
                </div>
              </div>

              <div testId="eq-device" style={{ width: 470, minWidth: 470, height: "100%", backgroundColor: colors.appSurface, borderWidth: 1, borderColor: colors.border, opacity: eqEnabled() ? 1 : 0.7 }}>
                <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "center", paddingLeft: 8, borderWidth: 1, borderColor: colors.border }}>
                  <text style={{ color: colors.foreground, fontSize: 10, fontWeight: 700 }}>EQ Eight</text>
                  <text style={{ marginLeft: 8, color: colors.mutedForeground, fontSize: 8 }}>Audio</text>
                  <div style={{ flexGrow: 1 }} />
                  <div testId="eq-enabled" onClick={() => setEqEnabled((enabled) => !enabled)} style={{ width: 38, height: 29, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: eqEnabled() ? "#083344" : colors.appSurface, cursor: "pointer" }}><text style={{ color: eqEnabled() ? colors.cyan : colors.mutedForeground, fontSize: 9 }}>{eqEnabled() ? "On" : "Off"}</text></div>
                </div>
                <div style={{ flexGrow: 1, minHeight: 0, padding: 10, gap: 9 }}>
                  <div style={{ flexGrow: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", gap: 5, padding: 8, backgroundColor: colors.graphBackground, borderWidth: 1, borderColor: colors.border }}>
                    <For each={[1, 2, 3, 4, 5, 6, 7]}>{(line) => <div style={{ position: "absolute", left: line * 52, top: 0, width: 1, height: "100%", backgroundColor: colors.graphGrid }} />}</For>
                    <div style={{ flexGrow: 1, height: clamp(52 + eqLowGain() * 3, 14, 90), backgroundColor: "#4ade80", opacity: 0.78 }} />
                    <div style={{ flexGrow: 1, height: clamp(52 + eqMidGain() * 3, 14, 90), backgroundColor: "#60a5fa", opacity: 0.82 }} />
                    <div style={{ flexGrow: 1, height: clamp(52 + eqHighGain() * 3, 14, 90), backgroundColor: "#c084fc", opacity: 0.82 }} />
                  </div>
                  <div style={{ height: 82, display: "flex", justifyContent: "center", gap: 14 }}>
                    <Knob testId="eq-low" label="Low 120Hz" value={signed(eqLowGain(), " dB")} active={eqEnabled()} onDecrease={() => setEqLowGain((value) => clamp(value - 1, -12, 12))} onIncrease={() => setEqLowGain((value) => clamp(value + 1, -12, 12))} />
                    <Knob testId="eq-mid" label="Mid 1.2k" value={signed(eqMidGain(), " dB")} active={eqEnabled()} onDecrease={() => setEqMidGain((value) => clamp(value - 1, -12, 12))} onIncrease={() => setEqMidGain((value) => clamp(value + 1, -12, 12))} />
                    <Knob testId="eq-high" label="High 7.8k" value={signed(eqHighGain(), " dB")} active={eqEnabled()} onDecrease={() => setEqHighGain((value) => clamp(value - 1, -12, 12))} onIncrease={() => setEqHighGain((value) => clamp(value + 1, -12, 12))} />
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
