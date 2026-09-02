import type { JSX } from "solid-js"
import SourceTransportControls from "../upstream/components/timeline/TransportControls"
import type { BrowserTab, TrackKind } from "./model"

export interface TransportControlsProps {
  browserOpen: boolean
  onOpenBrowser?: () => void
  onToggleBrowser: () => void
  onSelectBrowserTab?: (tab: BrowserTab) => void
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
  midiKeyboardCanPlay?: boolean
  midiKeyboardTargetLabel?: string | null
  onToggleMidiKeyboard: () => void
  playheadSec: number
  syncMix?: boolean
  onToggleSyncMix?: () => void
  onAddTrack?: (kind: TrackKind) => void
  onImportAudio?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onDeleteSelection?: () => void
  onDuplicateSelection?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomFit?: () => void
}

const noop = () => undefined

const TransportControls = (props: TransportControlsProps): JSX.Element => (
  <SourceTransportControls
    browser={{
      open: props.browserOpen,
      onOpen: props.onOpenBrowser ?? (() => { if (!props.browserOpen) props.onToggleBrowser() }),
      onToggle: props.onToggleBrowser,
      onSelectTab: props.onSelectBrowserTab ?? noop,
    }}
    isRecording={props.isRecording}
    onToggleRecord={props.onToggleRecord}
    isPlaying={props.isPlaying}
    onPlay={props.onPlay}
    onPause={props.onPause}
    onStop={props.onStop}
    onAddAudio={props.onImportAudio ?? noop}
    onUndo={props.onUndo ?? noop}
    onRedo={props.onRedo ?? noop}
    onDeleteSelection={props.onDeleteSelection ?? noop}
    onDuplicateSelection={props.onDuplicateSelection ?? noop}
    bpm={props.bpm}
    onChangeBpm={props.onChangeBpm}
    metronomeEnabled={props.metronomeEnabled}
    onToggleMetronome={props.onToggleMetronome}
    loopEnabled={props.loopEnabled}
    onToggleLoop={props.onToggleLoop}
    gridEnabled={props.gridEnabled}
    onToggleGrid={props.onToggleGrid}
    zoom={{
      onIn: props.onZoomIn ?? noop,
      onOut: props.onZoomOut ?? noop,
      onFit: props.onZoomFit ?? noop,
    }}
    gridDenominator={props.gridDenominator}
    onChangeGridDenominator={props.onChangeGridDenominator}
    automationOverrideCount={0}
    onReEnableAutomation={noop}
    tracksMenu={{
      syncMix: props.syncMix ?? false,
      onToggleSyncMix: props.onToggleSyncMix ?? noop,
      onAddTrack: () => props.onAddTrack?.("audio"),
      onAddReturnTrack: () => props.onAddTrack?.("return"),
      onAddGroupTrack: () => props.onAddTrack?.("group"),
      onAddInstrumentTrack: () => props.onAddTrack?.("midi"),
    }}
    projectMenu={{
      currentProjectId: "project:gpuix-solid1-daw",
      canManageSharing: false,
      projects: [{ projectId: "project:gpuix-solid1-daw", mode: "local" }],
      onOpenProject: noop,
      onCreateProject: noop,
      onDeleteProject: noop,
      onRenameProject: noop,
      onOpenExport: noop,
      onOpenDashboard: noop,
      onSignIn: noop,
      onLogout: noop,
      onAbout: noop,
      onExportArchive: noop,
      onImportArchive: noop,
    }}
    midiKeyboard={{
      enabled: () => props.midiKeyboardEnabled,
      canPlay: () => props.midiKeyboardCanPlay ?? false,
      targetLabel: () => props.midiKeyboardTargetLabel ?? null,
      octave: () => 0,
      toggle: props.onToggleMidiKeyboard,
    }}
    playheadSec={props.playheadSec}
  />
)

export default TransportControls
