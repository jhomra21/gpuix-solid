import { Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import { dawTheme, borderedControl, ghostButton, layout, text2xs, textXs } from "./theme"

export interface TransportControlsProps {
  browserOpen: boolean
  onToggleBrowser: () => void
  isRecording: boolean
  onToggleRecord: () => void
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  bpm: number
  onChangeBpm: (value: number) => void
  metronomeEnabled: boolean
  onToggleMetronome: () => void
  loopEnabled: boolean
  onToggleLoop: () => void
  gridEnabled: boolean
  onToggleGrid: () => void
  gridDenominator: number
  onChangeGridDenominator: () => void
  midiKeyboardEnabled: boolean
  onToggleMidiKeyboard: () => void
  playheadSec: number
}

const TransportControls = (props: TransportControlsProps): JSX.Element => (
  <div
    testId="transport"
    style={{
      height: layout.transportHeight,
      minHeight: layout.transportHeight,
      display: "flex",
      alignItems: "center",
      padding: 8,
      backgroundColor: dawTheme.timelineBackground,
      borderWidth: 1,
      borderColor: dawTheme.border,
      position: "relative",
    }}
  >
    <div style={{ position: "absolute", left: 8, top: 8, display: "flex", alignItems: "center", gap: 4 }}>
      <div testId="browser-toggle" onClick={props.onToggleBrowser} style={ghostButton(props.browserOpen)}>
        <text testId="browser-toggle-indicator" style={{ ...textXs, color: props.browserOpen ? dawTheme.foreground : dawTheme.mutedForeground }}>{props.browserOpen ? "▣" : "▢"}</text>
      </div>
    </div>

    <div style={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
      <div testId="transport-record" onClick={props.onToggleRecord} style={ghostButton(props.isRecording)}>
        <div testId="transport-record-indicator" style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: props.isRecording ? dawTheme.background : dawTheme.recording }} />
      </div>
      <div testId="transport-play" onClick={() => props.isPlaying ? props.onPause() : props.onPlay()} style={ghostButton(false)}>
        <text testId="transport-play-indicator" style={{ ...textXs, color: dawTheme.mutedForeground }}>{props.isPlaying ? "Ⅱ" : "▶"}</text>
      </div>
      <div testId="transport-stop" onClick={props.onStop} style={ghostButton(false)}>
        <text testId="transport-stop-indicator" style={{ ...text2xs, color: dawTheme.mutedForeground }}>■</text>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 3 }}>
        <input
          testId="bpm-input"
          value={String(props.bpm)}
          onChange={(event: EventPayload) => {
            const next = Number(event.value ?? "")
            if (Number.isFinite(next)) props.onChangeBpm(Math.max(40, Math.min(240, Math.round(next))))
          }}
          style={{ ...borderedControl(), width: 48, fontSize: 12, fontFamily: "monospace" }}
        />
        <text style={{ ...textXs, color: dawTheme.mutedForeground }}>BPM</text>
      </div>

      <div testId="metronome-toggle" onClick={props.onToggleMetronome} style={ghostButton(props.metronomeEnabled)}>
        <text testId="metronome-indicator" style={{ ...textXs, color: props.metronomeEnabled ? dawTheme.foreground : dawTheme.mutedForeground }}>⌃</text>
      </div>
      <div testId="loop-toggle" onClick={props.onToggleLoop} style={ghostButton(props.loopEnabled)}>
        <text testId="loop-indicator" style={{ ...textXs, color: props.loopEnabled ? dawTheme.green : dawTheme.mutedForeground }}>↻</text>
      </div>
      <div testId="grid-toggle" onClick={props.onToggleGrid} style={ghostButton(props.gridEnabled)}>
        <text testId="grid-indicator" style={{ ...textXs, color: props.gridEnabled ? dawTheme.green : dawTheme.mutedForeground }}>▦</text>
      </div>
      <div testId="grid-resolution" onClick={props.onChangeGridDenominator} style={{ ...ghostButton(false), minWidth: 42 }}>
        <text style={{ ...textXs, color: dawTheme.foreground }}>{`1/${props.gridDenominator}`}</text>
      </div>
    </div>

    <div style={{ position: "absolute", right: 8, top: 8, display: "flex", alignItems: "center", gap: 12 }}>
      <div testId="midi-keyboard-toggle" onClick={props.onToggleMidiKeyboard} style={ghostButton(props.midiKeyboardEnabled)}>
        <text testId="midi-keyboard-indicator" style={{ ...textXs, color: props.midiKeyboardEnabled ? dawTheme.green : dawTheme.mutedForeground }}>▤</text>
      </div>
      <div testId="save-status" style={{ ...ghostButton(false), cursor: "default" }}>
        <text testId="save-status-indicator" style={{ ...textXs, color: dawTheme.mutedForeground }}>▣</text>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Playhead</text>
        <text testId="transport-state" style={{ ...textXs, color: dawTheme.foreground, fontFamily: "monospace" }}>{`${props.playheadSec.toFixed(2)}s`}</text>
      </div>
      <Show when={props.isRecording}>
        <text style={{ ...text2xs, color: dawTheme.red }}>REC</text>
      </Show>
    </div>
  </div>
)

export default TransportControls