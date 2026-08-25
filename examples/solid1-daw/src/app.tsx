import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import type { EventPayload, StyleDesc } from "@jhomra21/gpuix-solid1"

type TrackKind = "audio" | "midi" | "return"
type BottomTab = "effects" | "clip"

interface DemoTrack {
  id: string
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
  trackId: string
  label: string
  left: number
  width: number
  color: string
}

interface BrowserItem {
  id: string
  label: string
  category: string
  meta: string
}

interface EqBand {
  id: string
  label: string
  frequency: number
  gain: number
}

const colors = {
  background: "#0f1013",
  timeline: "#111216",
  surface: "#191b20",
  surfaceMuted: "#24272e",
  surfaceRaised: "#2c3038",
  border: "#353941",
  text: "#f1f2f4",
  muted: "#9b9da5",
  faint: "#6e7179",
  red: "#de665d",
  green: "#62bb8e",
  blue: "#6e98df",
  amber: "#d7b45c",
  purple: "#9b82d4",
  cyan: "#66b5c7",
}

const bassTrack: DemoTrack = {
  id: "bass",
  name: "Bass",
  kind: "audio",
  color: "#5aa37f",
  volume: 0.78,
  pan: 0,
  send: 0.18,
  mute: false,
  solo: false,
  armed: false,
  meter: 0.64,
}

const initialTracks: DemoTrack[] = [
  {
    id: "drums",
    name: "Drums",
    kind: "audio",
    color: "#c97865",
    volume: 0.86,
    pan: 0,
    send: 0.08,
    mute: false,
    solo: false,
    armed: false,
    meter: 0.82,
  },
  bassTrack,
  {
    id: "synth",
    name: "Synth",
    kind: "midi",
    color: "#658dd1",
    volume: 0.72,
    pan: -12,
    send: 0.34,
    mute: false,
    solo: false,
    armed: true,
    meter: 0.55,
  },
  {
    id: "vocals",
    name: "Vocals",
    kind: "audio",
    color: "#9b7bc5",
    volume: 0.8,
    pan: 6,
    send: 0.24,
    mute: false,
    solo: false,
    armed: false,
    meter: 0.69,
  },
  {
    id: "return-a",
    name: "A · Reverb",
    kind: "return",
    color: "#b99b5d",
    volume: 0.66,
    pan: 0,
    send: 0,
    mute: false,
    solo: false,
    armed: false,
    meter: 0.38,
  },
]

const clips: DemoClip[] = [
  { id: "drums-a", trackId: "drums", label: "Drum Loop 01", left: 18, width: 210, color: "#4f956f" },
  { id: "drums-b", trackId: "drums", label: "Drum Loop 02", left: 242, width: 190, color: "#4f956f" },
  { id: "bass-a", trackId: "bass", label: "Bass Verse", left: 70, width: 270, color: "#527f70" },
  { id: "synth-a", trackId: "synth", label: "MIDI · Glass Pad", left: 156, width: 310, color: "#557cc2" },
  { id: "vocals-a", trackId: "vocals", label: "Lead Vocal", left: 32, width: 166, color: "#8669ad" },
  { id: "vocals-b", trackId: "vocals", label: "Hook Comp", left: 286, width: 204, color: "#8669ad" },
]

const browserItems: BrowserItem[] = [
  { id: "kick-tight", label: "Kick · Tight 04", category: "Drums", meta: "One-shot" },
  { id: "hat-dry", label: "Hi-Hat · Dry 12", category: "Drums", meta: "One-shot" },
  { id: "glass-pad", label: "Glass Pad", category: "Instruments", meta: "Wavetable" },
  { id: "analog-bass", label: "Round Analog Bass", category: "Instruments", meta: "Analog" },
  { id: "vocal-air", label: "Vocal Air 118", category: "Sounds", meta: "Loop" },
  { id: "compressor", label: "Compressor", category: "Audio Effects", meta: "Dynamics" },
  { id: "eq", label: "EQ Eight", category: "Audio Effects", meta: "EQ & Filters" },
  { id: "reverb", label: "Reverb", category: "Audio Effects", meta: "Space" },
]

const browserCategories = ["All", "Sounds", "Drums", "Instruments", "Audio Effects"] as const

const initialEqBands: EqBand[] = [
  { id: "low", label: "Low", frequency: 120, gain: -1 },
  { id: "mid", label: "Mid", frequency: 1200, gain: 2 },
  { id: "high", label: "High", frequency: 7800, gain: 0 },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function signed(value: number, suffix = ""): string {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${rounded(value)}${suffix}`
}

function buttonStyle(active = false, danger = false): StyleDesc {
  const activeBackground = danger ? "#6a2929" : "#303844"
  const activeBorder = danger ? colors.red : "#536071"
  return {
    minHeight: 28,
    paddingLeft: 9,
    paddingRight: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: active ? activeBorder : colors.border,
    borderRadius: 5,
    backgroundColor: active ? activeBackground : colors.surface,
    color: active && danger ? "#ffd6d2" : colors.text,
    cursor: "pointer",
    hover: { backgroundColor: colors.surfaceRaised },
    active: { opacity: 0.82 },
  }
}

function iconButtonStyle(active = false, danger = false): StyleDesc {
  const base = buttonStyle(active, danger)
  base.width = 30
  base.height = 30
  base.minHeight = 30
  base.paddingLeft = 0
  base.paddingRight = 0
  return base
}

interface SmallButtonProps {
  testId?: string
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}

function SmallButton(props: SmallButtonProps): JSX.Element {
  const content = (
    <div onClick={props.onClick} style={buttonStyle(Boolean(props.active), Boolean(props.danger))}>
      <text style={{ color: props.active && props.danger ? "#ffd6d2" : colors.text, fontSize: 11, fontWeight: 650 }}>{props.label}</text>
    </div>
  )
  if (!props.testId) return content
  return (
    <div testId={props.testId} onClick={props.onClick} style={buttonStyle(Boolean(props.active), Boolean(props.danger))}>
      <text style={{ color: props.active && props.danger ? "#ffd6d2" : colors.text, fontSize: 11, fontWeight: 650 }}>{props.label}</text>
    </div>
  )
}

interface ParameterControlProps {
  testId: string
  label: string
  value: string
  onDecrease: () => void
  onIncrease: () => void
}

function ParameterControl(props: ParameterControlProps): JSX.Element {
  return (
    <div style={{ minWidth: 104, gap: 5 }}>
      <text style={{ color: colors.faint, fontSize: 9, fontWeight: 700 }}>{props.label.toUpperCase()}</text>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div testId={`${props.testId}-minus`} onClick={props.onDecrease} style={iconButtonStyle()}>
          <text style={{ color: colors.muted, fontSize: 14 }}>−</text>
        </div>
        <div style={{ flexGrow: 1, minHeight: 30, minWidth: 54, paddingLeft: 6, paddingRight: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, borderRadius: 4 }}>
          <text testId={`${props.testId}-value`} style={{ color: colors.text, fontFamily: "monospace", fontSize: 10 }}>{props.value}</text>
        </div>
        <div testId={`${props.testId}-plus`} onClick={props.onIncrease} style={iconButtonStyle()}>
          <text style={{ color: colors.muted, fontSize: 14 }}>+</text>
        </div>
      </div>
    </div>
  )
}

export function DawSolid1Showcase(): JSX.Element {
  const [tracks, setTracks] = createSignal<DemoTrack[]>(initialTracks)
  const [selectedTrackId, setSelectedTrackId] = createSignal("synth")
  const [selectedClipId, setSelectedClipId] = createSignal("synth-a")
  const [browserOpen, setBrowserOpen] = createSignal(true)
  const [browserCategory, setBrowserCategory] = createSignal<string>("All")
  const [browserSearch, setBrowserSearch] = createSignal("")
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [isRecording, setIsRecording] = createSignal(false)
  const [bpm, setBpm] = createSignal(120)
  const [metronome, setMetronome] = createSignal(false)
  const [loop, setLoop] = createSignal(true)
  const [grid, setGrid] = createSignal(true)
  const [gridDenominator, setGridDenominator] = createSignal(16)
  const [effectsOpen, setEffectsOpen] = createSignal(true)
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("effects")
  const [compressorEnabled, setCompressorEnabled] = createSignal(true)
  const [compressorThreshold, setCompressorThreshold] = createSignal(-18)
  const [compressorRatio, setCompressorRatio] = createSignal(4)
  const [compressorAttack, setCompressorAttack] = createSignal(12)
  const [compressorRelease, setCompressorRelease] = createSignal(120)
  const [compressorWet, setCompressorWet] = createSignal(1)
  const [eqEnabled, setEqEnabled] = createSignal(true)
  const [eqBands, setEqBands] = createSignal<EqBand[]>(initialEqBands)

  const selectedTrack = createMemo<DemoTrack>(() => tracks().find((track) => track.id === selectedTrackId()) ?? bassTrack)
  const selectedClip = createMemo(() => clips.find((clip) => clip.id === selectedClipId()))
  const visibleBrowserItems = createMemo(() => {
    const query = browserSearch().trim().toLowerCase()
    return browserItems.filter((item) => {
      if (browserCategory() !== "All" && item.category !== browserCategory()) return false
      if (!query) return true
      return item.label.toLowerCase().includes(query) || item.meta.toLowerCase().includes(query)
    })
  })

  const updateTrack = (trackId: string, updates: Partial<DemoTrack>): void => {
    setTracks((current) => current.map((track) => track.id === trackId ? { ...track, ...updates } : track))
  }

  const adjustSelectedTrack = (field: "volume" | "pan" | "send", delta: number): void => {
    const track = selectedTrack()
    const current = track[field]
    const next = field === "pan" ? clamp(current + delta, -50, 50) : clamp(current + delta, 0, 1)
    updateTrack(track.id, { [field]: rounded(next) })
  }

  const cycleGrid = (): void => {
    const current = gridDenominator()
    if (current === 8) setGridDenominator(16)
    else if (current === 16) setGridDenominator(32)
    else setGridDenominator(8)
  }

  const selectClip = (clip: DemoClip): void => {
    setSelectedClipId(clip.id)
    setSelectedTrackId(clip.trackId)
  }

  const adjustEqGain = (bandId: string, delta: number): void => {
    setEqBands((current) => current.map((band) => band.id === bandId ? { ...band, gain: clamp(band.gain + delta, -12, 12) } : band))
  }

  return (
    <div testId="daw-showcase" style={{ width: "100%", height: "100%", minWidth: 1080, minHeight: 700, backgroundColor: colors.background, color: colors.text, fontFamily: "system-ui", overflow: "hidden" }}>
      <div testId="transport" style={{ height: 52, minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 10, paddingRight: 10, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, position: "relative" }}>
        <div style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", gap: 7 }}>
          <div testId="browser-toggle" onClick={() => setBrowserOpen((open) => !open)} style={iconButtonStyle(browserOpen())}>
            <text style={{ color: browserOpen() ? colors.blue : colors.muted, fontSize: 13 }}>☰</text>
          </div>
          <text style={{ color: colors.text, fontSize: 12, fontWeight: 750 }}>DAW Browser</text>
          <text style={{ color: colors.faint, fontSize: 10 }}>Model Independent</text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div testId="transport-record" onClick={() => setIsRecording((active) => !active)} style={iconButtonStyle(isRecording(), true)}>
            <text style={{ color: isRecording() ? "#ffd6d2" : colors.red, fontSize: 15 }}>●</text>
          </div>
          <div testId="transport-play" onClick={() => setIsPlaying((playing) => !playing)} style={iconButtonStyle(isPlaying())}>
            <text style={{ color: colors.text, fontSize: 12 }}>{isPlaying() ? "Ⅱ" : "▶"}</text>
          </div>
          <div testId="transport-stop" onClick={() => { setIsPlaying(false); setIsRecording(false) }} style={iconButtonStyle()}>
            <text style={{ color: colors.text, fontSize: 11 }}>■</text>
          </div>
          <input
            testId="bpm-input"
            value={String(bpm())}
            onChange={(event: EventPayload) => {
              const next = Number(event.value ?? "")
              if (Number.isFinite(next)) setBpm(Math.round(clamp(next, 40, 240)))
            }}
            style={{ width: 58, height: 30, paddingLeft: 8, paddingRight: 8, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}
          />
          <text style={{ color: colors.faint, fontSize: 9 }}>BPM</text>
          <SmallButton testId="metronome-toggle" label="Metro" active={metronome()} onClick={() => setMetronome((active) => !active)} />
          <SmallButton testId="loop-toggle" label="Loop" active={loop()} onClick={() => setLoop((active) => !active)} />
          <SmallButton testId="grid-toggle" label="Grid" active={grid()} onClick={() => setGrid((active) => !active)} />
          <SmallButton testId="grid-resolution" label={`1/${gridDenominator()}`} active={grid()} onClick={cycleGrid} />
        </div>

        <div style={{ position: "absolute", right: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <text testId="transport-state" style={{ color: isRecording() ? colors.red : isPlaying() ? colors.green : colors.faint, fontSize: 10, fontWeight: 700 }}>{isRecording() ? "Recording" : isPlaying() ? "Playing" : "Stopped"}</text>
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
          <text style={{ color: colors.muted, fontSize: 10 }}>Local</text>
        </div>
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
        <Show when={browserOpen()}>
          <div testId="browser-sidebar" style={{ width: 224, minWidth: 224, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflowY: "auto" }}>
            <div style={{ padding: 10, gap: 8 }}>
              <text style={{ color: colors.text, fontSize: 12, fontWeight: 750 }}>Browser</text>
              <input
                testId="browser-search"
                value={browserSearch()}
                placeholder="Search sounds and devices"
                onChange={(event: EventPayload) => setBrowserSearch(event.value ?? "")}
                style={{ height: 34, paddingLeft: 9, paddingRight: 9, backgroundColor: colors.timeline, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 5, fontSize: 10 }}
              />
              <div style={{ gap: 3 }}>
                <For each={browserCategories}>
                  {(category) => (
                    <div testId={`browser-category-${category.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setBrowserCategory(category)} style={{ minHeight: 28, paddingLeft: 8, paddingRight: 8, justifyContent: "center", backgroundColor: browserCategory() === category ? colors.surfaceRaised : colors.surface, borderRadius: 4, cursor: "pointer", hover: { backgroundColor: colors.surfaceMuted } }}>
                      <text style={{ color: browserCategory() === category ? colors.text : colors.muted, fontSize: 10 }}>{category}</text>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div style={{ borderWidth: 1, borderColor: colors.border }} />
            <div testId="browser-results" style={{ padding: 8, gap: 3 }}>
              <For each={visibleBrowserItems()}>
                {(item) => (
                  <div
                    testId={`browser-result-${item.id}`}
                    onClick={() => {
                      if (item.category === "Audio Effects") {
                        setEffectsOpen(true)
                        setBottomTab("effects")
                      }
                    }}
                    style={{ minHeight: 42, paddingLeft: 8, paddingRight: 8, justifyContent: "center", gap: 2, borderRadius: 4, cursor: "pointer", hover: { backgroundColor: colors.surfaceMuted } }}
                  >
                    <text style={{ color: colors.text, fontSize: 10, fontWeight: 650 }}>{item.label}</text>
                    <text style={{ color: colors.faint, fontSize: 8 }}>{item.meta}</text>
                  </div>
                )}
              </For>
              <Show when={visibleBrowserItems().length === 0}>
                <text style={{ padding: 10, color: colors.faint, fontSize: 9 }}>No matching devices</text>
              </Show>
            </div>
          </div>
        </Show>

        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, backgroundColor: colors.timeline }}>
          <div style={{ height: 32, minHeight: 32, display: "flex", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <div style={{ width: 190, minWidth: 190, paddingLeft: 10, justifyContent: "center" }}>
              <text style={{ color: colors.muted, fontSize: 9, fontWeight: 700 }}>TRACKS</text>
            </div>
            <div style={{ flexGrow: 1, display: "flex", position: "relative", overflow: "hidden" }}>
              <For each={[1, 2, 3, 4, 5, 6, 7, 8]}>
                {(bar) => (
                  <div style={{ flexGrow: 1, paddingLeft: 6, justifyContent: "center", borderWidth: 1, borderColor: "#24272d" }}>
                    <text style={{ color: colors.faint, fontSize: 8 }}>{bar}</text>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div style={{ minHeight: 0, overflowY: "auto" }}>
            <For each={tracks()}>
              {(track) => (
                <div style={{ height: 56, minHeight: 56, display: "flex", borderWidth: 1, borderColor: "#292c33" }}>
                  <div testId={`track-${track.id}`} onClick={() => setSelectedTrackId(track.id)} style={{ width: 190, minWidth: 190, display: "flex", alignItems: "center", gap: 6, paddingLeft: 6, paddingRight: 6, backgroundColor: selectedTrackId() === track.id ? colors.surfaceRaised : colors.surface, cursor: "pointer", hover: { backgroundColor: colors.surfaceMuted } }}>
                    <div style={{ width: 4, minWidth: 4, height: 40, borderRadius: 2, backgroundColor: track.color }} />
                    <div style={{ flexGrow: 1, minWidth: 0, gap: 3 }}>
                      <text style={{ color: colors.text, fontSize: 10, fontWeight: 650, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{track.name}</text>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <div testId={`track-${track.id}-mute`} onClick={() => updateTrack(track.id, { mute: !track.mute })} style={iconButtonStyle(track.mute)}><text style={{ color: track.mute ? colors.amber : colors.faint, fontSize: 8, fontWeight: 800 }}>M</text></div>
                        <div testId={`track-${track.id}-solo`} onClick={() => updateTrack(track.id, { solo: !track.solo })} style={iconButtonStyle(track.solo)}><text style={{ color: track.solo ? colors.amber : colors.faint, fontSize: 8, fontWeight: 800 }}>S</text></div>
                        <Show when={track.kind !== "return"}>
                          <div testId={`track-${track.id}-arm`} onClick={() => updateTrack(track.id, { armed: !track.armed })} style={iconButtonStyle(track.armed, true)}><text style={{ color: track.armed ? "#ffd6d2" : colors.red, fontSize: 9 }}>●</text></div>
                        </Show>
                      </div>
                    </div>
                    <div style={{ width: 7, height: 40, justifyContent: "flex-end", backgroundColor: colors.timeline, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: 7, height: `${Math.round((isPlaying() ? track.meter : track.meter * 0.22) * 100)}%`, backgroundColor: track.meter > 0.75 ? colors.amber : colors.green }} />
                    </div>
                  </div>

                  <div style={{ flexGrow: 1, position: "relative", overflow: "hidden", backgroundColor: selectedTrackId() === track.id ? "#15171c" : colors.timeline }}>
                    <For each={[1, 2, 3, 4, 5, 6, 7]}>
                      {(gridLine) => <div style={{ position: "absolute", left: gridLine * 96, top: 0, width: 1, height: 56, backgroundColor: gridLine % 2 === 0 ? "#2b2e35" : "#202228" }} />}
                    </For>
                    <For each={clips.filter((clip) => clip.trackId === track.id)}>
                      {(clip) => (
                        <div
                          testId={`clip-${clip.id}`}
                          onClick={() => selectClip(clip)}
                          style={{ position: "absolute", left: clip.left, top: 8, width: clip.width, height: 38, paddingLeft: 8, paddingRight: 6, justifyContent: "center", backgroundColor: clip.color, borderWidth: selectedClipId() === clip.id ? 2 : 1, borderColor: selectedClipId() === clip.id ? colors.amber : "#ffffff22", borderRadius: 4, cursor: "pointer", hover: { opacity: 0.9 } }}
                        >
                          <text style={{ color: "#f7f8fa", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{clip.label}</text>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div testId="inspector" style={{ width: 260, minWidth: 260, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflowY: "auto" }}>
          <div style={{ padding: 12, gap: 4, borderWidth: 1, borderColor: colors.border }}>
            <text style={{ color: colors.faint, fontSize: 9, fontWeight: 800 }}>INSPECTOR</text>
            <text testId="inspector-title" style={{ color: colors.text, fontSize: 17, fontWeight: 750 }}>{selectedTrack().name}</text>
            <text style={{ color: colors.muted, fontSize: 9 }}>{selectedTrack().kind === "midi" ? "Instrument Track" : selectedTrack().kind === "return" ? "Return Track" : "Audio Track"}</text>
          </div>

          <div style={{ padding: 12, gap: 12 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <SmallButton testId="inspector-mute" label="Mute" active={selectedTrack().mute} onClick={() => updateTrack(selectedTrack().id, { mute: !selectedTrack().mute })} />
              <SmallButton testId="inspector-solo" label="Solo" active={selectedTrack().solo} onClick={() => updateTrack(selectedTrack().id, { solo: !selectedTrack().solo })} />
              <Show when={selectedTrack().kind !== "return"}>
                <SmallButton testId="inspector-arm" label="Arm" active={selectedTrack().armed} danger={selectedTrack().armed} onClick={() => updateTrack(selectedTrack().id, { armed: !selectedTrack().armed })} />
              </Show>
            </div>
            <text testId="inspector-status" style={{ color: selectedTrack().mute ? colors.amber : colors.muted, fontSize: 9 }}>{selectedTrack().mute ? "Muted" : selectedTrack().solo ? "Solo" : selectedTrack().armed ? "Record armed" : "Active"}</text>

            <ParameterControl testId="inspector-volume" label="Volume" value={percent(selectedTrack().volume)} onDecrease={() => adjustSelectedTrack("volume", -0.05)} onIncrease={() => adjustSelectedTrack("volume", 0.05)} />
            <ParameterControl testId="inspector-pan" label="Pan" value={selectedTrack().pan === 0 ? "C" : selectedTrack().pan < 0 ? `${Math.abs(selectedTrack().pan)}L` : `${selectedTrack().pan}R`} onDecrease={() => adjustSelectedTrack("pan", -5)} onIncrease={() => adjustSelectedTrack("pan", 5)} />
            <ParameterControl testId="inspector-send" label="Send A" value={percent(selectedTrack().send)} onDecrease={() => adjustSelectedTrack("send", -0.05)} onIncrease={() => adjustSelectedTrack("send", 0.05)} />

            <div style={{ gap: 5, padding: 9, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, borderRadius: 5 }}>
              <text style={{ color: colors.faint, fontSize: 8, fontWeight: 800 }}>ROUTING</text>
              <div style={{ display: "flex", justifyContent: "space-between" }}><text style={{ color: colors.muted, fontSize: 9 }}>Input</text><text style={{ color: colors.text, fontSize: 9 }}>{selectedTrack().kind === "midi" ? "MIDI All" : "Ext. In"}</text></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><text style={{ color: colors.muted, fontSize: 9 }}>Output</text><text style={{ color: colors.text, fontSize: 9 }}>Master</text></div>
            </div>

            <Show when={selectedClip()}>
              {(clip) => (
                <div style={{ gap: 4, padding: 9, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, borderRadius: 5 }}>
                  <text style={{ color: colors.faint, fontSize: 8, fontWeight: 800 }}>SELECTED CLIP</text>
                  <text testId="selected-clip-label" style={{ color: colors.text, fontSize: 10, fontWeight: 650 }}>{clip().label}</text>
                  <text style={{ color: colors.muted, fontSize: 8 }}>Warp · Complex Pro</text>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>

      <Show
        when={effectsOpen()}
        fallback={(
          <div testId="bottom-panel-closed" style={{ height: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 10, paddingRight: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <text style={{ color: colors.muted, fontSize: 9 }}>Effects · {selectedTrack().name}</text>
            <SmallButton testId="bottom-panel-open" label="Show" onClick={() => setEffectsOpen(true)} />
          </div>
        )}
      >
        <div testId="bottom-panel" style={{ height: 286, minHeight: 286, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <div style={{ height: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 8, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <SmallButton testId="bottom-tab-effects" label="Effects" active={bottomTab() === "effects"} onClick={() => setBottomTab("effects")} />
              <SmallButton testId="bottom-tab-clip" label="Clip" active={bottomTab() === "clip"} onClick={() => setBottomTab("clip")} />
              <text style={{ marginLeft: 6, color: colors.faint, fontSize: 9 }}>{selectedTrack().name}</text>
            </div>
            <SmallButton testId="bottom-panel-close" label="Hide" onClick={() => setEffectsOpen(false)} />
          </div>

          <Show
            when={bottomTab() === "effects"}
            fallback={(
              <div testId="clip-panel" style={{ flexGrow: 1, padding: 14, display: "flex", gap: 12 }}>
                <div style={{ width: 280, padding: 12, gap: 7, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
                  <text style={{ color: colors.faint, fontSize: 8, fontWeight: 800 }}>CLIP</text>
                  <text style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>{selectedClip()?.label ?? "No clip selected"}</text>
                  <text style={{ color: colors.muted, fontSize: 9 }}>Start 1.1.1 · Length 4 bars</text>
                </div>
                <div style={{ flexGrow: 1, padding: 12, gap: 8, backgroundColor: colors.timeline, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
                  <text style={{ color: colors.faint, fontSize: 8, fontWeight: 800 }}>WARP</text>
                  <text style={{ color: colors.text, fontSize: 11 }}>Complex Pro</text>
                  <text style={{ color: colors.muted, fontSize: 9 }}>Transient loop mode · 120 BPM</text>
                </div>
              </div>
            )}
          >
            <div testId="effects-panel" style={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 9, padding: 9, overflowX: "auto" }}>
              <div testId="compressor-device" style={{ flexGrow: 1, minWidth: 520, padding: 10, gap: 8, backgroundColor: colors.timeline, borderWidth: 1, borderColor: compressorEnabled() ? "#4b5869" : colors.border, borderRadius: 6, opacity: compressorEnabled() ? 1 : 0.66 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ gap: 2 }}><text style={{ color: colors.text, fontSize: 12, fontWeight: 750 }}>Compressor</text><text style={{ color: colors.faint, fontSize: 8 }}>Audio · Dynamics</text></div>
                  <SmallButton testId="compressor-enabled" label={compressorEnabled() ? "On" : "Off"} active={compressorEnabled()} onClick={() => setCompressorEnabled((enabled) => !enabled)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ParameterControl testId="compressor-ratio" label="Ratio" value={`${compressorRatio()}:1`} onDecrease={() => setCompressorRatio((value) => clamp(value - 1, 1, 20))} onIncrease={() => setCompressorRatio((value) => clamp(value + 1, 1, 20))} />
                  <ParameterControl testId="compressor-attack" label="Attack" value={`${compressorAttack()} ms`} onDecrease={() => setCompressorAttack((value) => clamp(value - 2, 0, 100))} onIncrease={() => setCompressorAttack((value) => clamp(value + 2, 0, 100))} />
                  <ParameterControl testId="compressor-release" label="Release" value={`${compressorRelease()} ms`} onDecrease={() => setCompressorRelease((value) => clamp(value - 10, 20, 800))} onIncrease={() => setCompressorRelease((value) => clamp(value + 10, 20, 800))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ParameterControl testId="compressor-threshold" label="Threshold" value={`${compressorThreshold()} dB`} onDecrease={() => setCompressorThreshold((value) => clamp(value - 1, -60, 0))} onIncrease={() => setCompressorThreshold((value) => clamp(value + 1, -60, 0))} />
                  <ParameterControl testId="compressor-wet" label="Dry / Wet" value={percent(compressorWet())} onDecrease={() => setCompressorWet((value) => rounded(clamp(value - 0.1, 0, 1)))} onIncrease={() => setCompressorWet((value) => rounded(clamp(value + 0.1, 0, 1)))} />
                  <div style={{ flexGrow: 1, minWidth: 128, height: 68, alignItems: "flex-end", justifyContent: "flex-end", padding: 7, backgroundColor: "#0b0d10", borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <For each={[0, 1, 2, 3, 4, 5]}>{(line) => <div style={{ position: "absolute", left: line * 30, top: 0, width: 1, height: 68, backgroundColor: "#20252c" }} />}</For>
                    <div style={{ width: "92%", height: 2, backgroundColor: colors.cyan }} />
                    <text style={{ marginTop: 5, color: colors.amber, fontFamily: "monospace", fontSize: 8 }}>GR −3.8 dB</text>
                  </div>
                </div>
              </div>

              <div testId="eq-device" style={{ flexGrow: 1, minWidth: 430, padding: 10, gap: 8, backgroundColor: colors.timeline, borderWidth: 1, borderColor: eqEnabled() ? "#4b5869" : colors.border, borderRadius: 6, opacity: eqEnabled() ? 1 : 0.66 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ gap: 2 }}><text style={{ color: colors.text, fontSize: 12, fontWeight: 750 }}>EQ Eight</text><text style={{ color: colors.faint, fontSize: 8 }}>Audio · EQ & Filters</text></div>
                  <SmallButton testId="eq-enabled" label={eqEnabled() ? "On" : "Off"} active={eqEnabled()} onClick={() => setEqEnabled((enabled) => !enabled)} />
                </div>
                <div style={{ height: 72, display: "flex", alignItems: "center", gap: 5, padding: 7, backgroundColor: "#0b0d10", borderWidth: 1, borderColor: colors.border, borderRadius: 4 }}>
                  <For each={eqBands()}>
                    {(band) => (
                      <div style={{ flexGrow: 1, height: 56, alignItems: "center", justifyContent: "center", gap: 3 }}>
                        <div style={{ width: "75%", height: clamp(22 + band.gain * 2, 8, 48), backgroundColor: band.id === "low" ? colors.green : band.id === "mid" ? colors.blue : colors.purple, borderRadius: 3 }} />
                        <text style={{ color: colors.faint, fontSize: 7 }}>{band.label}</text>
                      </div>
                    )}
                  </For>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <For each={eqBands()}>
                    {(band) => (
                      <ParameterControl testId={`eq-${band.id}`} label={`${band.label} ${band.frequency}Hz`} value={signed(band.gain, " dB")} onDecrease={() => adjustEqGain(band.id, -1)} onIncrease={() => adjustEqGain(band.id, 1)} />
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
