import type { Accessor } from "solid-js"

export type TransportControlsProps = {
  isPlaying: boolean
  playheadSec: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  bpm: number
  onChangeBpm: (next: number) => void
  metronomeEnabled: boolean
  onToggleMetronome: () => void
  gridEnabled: boolean
  onToggleGrid: () => void
  gridDenominator: number
  onChangeGridDenominator: (next: number) => void
  loopEnabled: boolean
  onToggleLoop: () => void
  isRecording: boolean
  onToggleRecord: () => void
  automationOverrideCount: number
  onReEnableAutomation: () => void
  tracksMenu: unknown
  projectMenu: {
    currentProjectId: string
    currentUserId?: string
    projects: Array<{ projectId: string; mode?: string }>
    sharedOutboxStatus?: { pending: number; failed: number }
    cloudBackupStatus?: string
  }
  browser: {
    open: boolean
    onToggle: () => void
  }
  midiKeyboard: {
    enabled: Accessor<boolean>
    canPlay: Accessor<boolean>
    targetLabel: Accessor<string | null>
    octave: Accessor<number>
    toggle: () => void
  }
}
