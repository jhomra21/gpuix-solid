import type { JSX } from "solid-js"
import SourceTransportControls from "../upstream/components/timeline/TransportControls"

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
  onChangeGridDenominator: (next: number) => void
  midiKeyboardEnabled: boolean
  onToggleMidiKeyboard: () => void
  playheadSec: number
}

const noop = () => undefined

const TransportControls = (props: TransportControlsProps): JSX.Element => (
  <SourceTransportControls
    browser={{
      open: props.browserOpen,
      onToggle: props.onToggleBrowser,
    }}
    isRecording={props.isRecording}
    onToggleRecord={props.onToggleRecord}
    isPlaying={props.isPlaying}
    onPlay={props.onPlay}
    onPause={props.onPause}
    onStop={props.onStop}
    bpm={props.bpm}
    onChangeBpm={props.onChangeBpm}
    metronomeEnabled={props.metronomeEnabled}
    onToggleMetronome={props.onToggleMetronome}
    loopEnabled={props.loopEnabled}
    onToggleLoop={props.onToggleLoop}
    gridEnabled={props.gridEnabled}
    onToggleGrid={props.onToggleGrid}
    gridDenominator={props.gridDenominator}
    onChangeGridDenominator={props.onChangeGridDenominator}
    automationOverrideCount={0}
    onReEnableAutomation={noop}
    tracksMenu={{}}
    projectMenu={{
      currentProjectId: "local:gpuix-solid1-daw",
      projects: [{ projectId: "local:gpuix-solid1-daw", mode: "local" }],
    }}
    midiKeyboard={{
      enabled: () => props.midiKeyboardEnabled,
      canPlay: () => false,
      targetLabel: () => null,
      octave: () => 0,
      toggle: props.onToggleMidiKeyboard,
    }}
    playheadSec={props.playheadSec}
  />
)

export default TransportControls
