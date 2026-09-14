import type { Accessor } from "solid-js"
import type {
  AutomationEnvelope,
  AutomationParameterSelection,
  AutomationTargetDeviceInstance,
} from "./daw-browser-shared"
import type { Track } from "./timeline-core-types"

export type TimelineWorkspaceAutomationModel = {
  projectId: string
  lanes: {
    visibleByTrackId: Record<string, boolean>
    visibleTargetKeysByTrackId: Record<string, string[]>
    heightsByLaneOwnerKey: Record<string, number>
    masterVisible: boolean
    masterHeight: number
    selectedTargetsByOwnerKey: Record<string, AutomationParameterSelection>
    selectionByTargetKey: Map<string, AutomationParameterSelection>
    effectInstancesByOwnerKey: Record<string, AutomationTargetDeviceInstance[]>
  }
  evaluatedValuesByTargetKey: Accessor<ReadonlyMap<string, number>>
  envelopes: {
    byTargetKey: Map<string, AutomationEnvelope>
    preview: (envelope: AutomationEnvelope | undefined) => void
    commit: (envelope: AutomationEnvelope | undefined, targetKey?: string) => void
    cancelPreview: (targetKey: string) => void
  }
  actions: {
    toggleMasterVisibility: () => void
    toggleTrackVisibility: (trackId: Track["id"]) => void
    addTrackLane: (trackId: Track["id"]) => void
    showTrackLane: (trackId: Track["id"], selection: AutomationParameterSelection) => void
    hideTrackLane: (trackId: Track["id"], targetKey: string) => void
    resizeMasterLane: (height: number) => void
    resizeTrackLane: (trackId: Track["id"], height: number) => void
    selectParameter: (targetKey: string, selection: AutomationParameterSelection) => void
    overrideTarget: (targetKey: string) => void
  }
}
