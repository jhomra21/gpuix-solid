import type { Accessor } from "solid-js"

export type TransportControlsProps = {
  isPlaying: boolean
  playheadSec: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onAddAudio: () => void
  onUndo: () => void
  onRedo: () => void
  onDeleteSelection: () => void
  onDuplicateSelection: () => void
  bpm: number
  onChangeBpm: (next: number) => void
  metronomeEnabled: boolean
  onToggleMetronome: () => void
  gridEnabled: boolean
  onToggleGrid: () => void
  zoom: {
    onIn: () => void
    onOut: () => void
    onFit: () => void
  }
  gridDenominator: number
  onChangeGridDenominator: (next: number) => void
  loopEnabled: boolean
  onToggleLoop: () => void
  isRecording: boolean
  onToggleRecord: () => void
  automationOverrideCount: number
  onReEnableAutomation: () => void
  tracksMenu: {
    syncMix: boolean
    onToggleSyncMix: () => void
    onAddTrack: () => void | Promise<void>
    onAddReturnTrack: () => void | Promise<void>
    onAddGroupTrack: () => void | Promise<void>
    onAddInstrumentTrack: () => void | Promise<void>
  }
  projectMenu: {
    currentProjectId: string
    currentUserId?: string
    canManageSharing: boolean
    projects: Array<{ projectId: string; mode?: string }>
    onOpenProject: (projectId: string) => void
    onCreateProject: () => void | Promise<void>
    onDeleteProject: (projectId: string) => void | Promise<void>
    onRenameProject: (projectId: string, name: string) => void | Promise<void>
    onOpenExport: () => void
    onOpenDashboard: (view: string) => void
    onSignIn: () => void
    onLogout: () => void | Promise<void>
    onAbout: () => void
    onExportArchive: () => void | Promise<void>
    onImportArchive: () => void | Promise<void>
    sharedOutboxStatus?: { pending: number; failed: number }
    cloudBackupStatus?: string
  }
  browser: {
    open: boolean
    onOpen: () => void
    onToggle: () => void
    onSelectTab: (tab: "assets" | "effects" | "midi-instruments") => void
  }
  midiKeyboard: {
    enabled: Accessor<boolean>
    canPlay: Accessor<boolean>
    targetLabel: Accessor<string | null>
    octave: Accessor<number>
    toggle: () => void
  }
}
