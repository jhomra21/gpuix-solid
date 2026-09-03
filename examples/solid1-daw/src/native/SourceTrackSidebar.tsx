import { createMemo, createSignal, type JSX } from "solid-js"
import { automationTargetKey, type AutomationParameterSelection } from "../compat/daw-browser-shared"
import type { TimelineWorkspaceAutomationModel } from "../compat/useTimelineAutomationController"
import type { TrackSend } from "../compat/timeline-core-types"
import UpstreamTrackSidebar, { type TrackSidebarModel } from "../upstream/components/timeline/TrackSidebar"
import { masterAreaHeight } from "../upstream/components/timeline/MasterSidebarRow"
import {
  buildTimelineTrackLayout,
  buildTrackTree,
  computeDepthMap,
  flattenVisibleTracks,
} from "../upstream/lib/timeline-track-layout"
import type { TrackDropTarget } from "../upstream/lib/track-group-ops"
import type { NativeTrack } from "./model"
import { sourceTracks } from "./sourceTrackAdapter"
import { layout } from "./theme"

export type SourceTrackSidebarProps = {
  tracks: NativeTrack[]
  selectedTrackId: string
  bottomPanelOffsetPx: number
  scrollElement: () => HTMLDivElement | undefined
  masterVolume: number
  onSelectTrack: (id: string) => void
  onSelectMaster: () => void
  onSetCollapsed: (id: string, collapsed: boolean) => void
  onSetOutputTarget: (id: string, targetId?: string) => void
  onSetSends: (id: string, sends: TrackSend[]) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onToggleArm: (id: string) => void
  onVolumeChange: (id: string, value: number) => void
  onToggleAutomation: (id: string) => void
  onAddAutomationLane?: (id: string) => void
  onHideAutomationLane: (id: string) => void
  onMasterVolumeChange: (value: number) => void
  onSetTrackColor: (id: string, color: string | undefined) => void
  onAssignTrackColorToClips: (id: string) => void
  onResetClipColors: (id: string) => void
  onDeleteTrack: (id: string) => void
  onGroupTracks?: (ids: string[]) => void
  onUngroupTrack?: (id: string) => void
  onMoveTrackToGroup?: (id: string, groupId: string | undefined) => void
  onReorderTracks?: (ids: string[], target: TrackDropTarget) => void
}

export default function SourceTrackSidebar(props: SourceTrackSidebarProps): JSX.Element {
  const [laneHeights, setLaneHeights] = createSignal<Record<string, number>>({})
  const [selections, setSelections] = createSignal<Record<string, AutomationParameterSelection>>({})
  const [masterAutomationVisible, setMasterAutomationVisible] = createSignal(false)
  const [masterAutomationHeight, setMasterAutomationHeight] = createSignal(48)

  const tracks = createMemo(() => sourceTracks(props.tracks))
  const trackById = createMemo(() => new Map(tracks().map((track) => [track.id, track])))
  const visibleByTrackId = createMemo<Record<string, boolean>>(() => Object.fromEntries(
    props.tracks.map((track) => [track.id, track.automationVisible]),
  ))
  const visibleTargetKeysByTrackId = createMemo<Record<string, string[]>>(() => Object.fromEntries(
    props.tracks.map((track) => [
      track.id,
      track.automationVisible
        ? [automationTargetKey({ kind: "track", trackId: track.id }, "volume")]
        : [],
    ]),
  ))
  const tree = createMemo(() => buildTrackTree(tracks()))
  const visibleTrackIds = createMemo(() => flattenVisibleTracks(
    tree(),
    Object.fromEntries(tracks().map((track) => [track.id, track.collapsed])),
  ))
  const depthByTrackId = createMemo(() => computeDepthMap(tree()))
  const trackLayout = createMemo(() => buildTimelineTrackLayout({
    tracks: tracks(),
    visibleTrackIds: visibleTrackIds(),
    depthByTrackId: depthByTrackId(),
    visibleByTrackId: visibleByTrackId(),
    heightsByLaneOwnerKey: laneHeights(),
    visibleParameterIdsByTrackId: visibleTargetKeysByTrackId(),
  }))

  const selectedTargetsByOwnerKey = createMemo<Record<string, AutomationParameterSelection>>(() => ({
    master: selections().master ?? { parameterId: "volume" },
    ...Object.fromEntries(tracks().map((track) => [
      track.id,
      selections()[track.id] ?? { parameterId: "volume" },
    ])),
  }))

  const automation = createMemo<TimelineWorkspaceAutomationModel>(() => ({
    projectId: "native-source-first-demo",
    lanes: {
      visibleByTrackId: visibleByTrackId(),
      visibleTargetKeysByTrackId: visibleTargetKeysByTrackId(),
      heightsByLaneOwnerKey: laneHeights(),
      masterVisible: masterAutomationVisible(),
      masterHeight: masterAutomationHeight(),
      selectedTargetsByOwnerKey: selectedTargetsByOwnerKey(),
      selectionByTargetKey: new Map(),
      effectInstancesByOwnerKey: Object.fromEntries([
        ["master", []],
        ...tracks().map((track) => [track.id, []]),
      ]),
    },
    evaluatedValuesByTargetKey: () => new Map(),
    envelopes: {
      byTargetKey: new Map(),
      preview: () => {},
      commit: () => {},
      cancelPreview: () => {},
    },
    actions: {
      toggleMasterVisibility: () => setMasterAutomationVisible((visible) => !visible),
      toggleTrackVisibility: props.onToggleAutomation,
      addTrackLane: (trackId) => props.onAddAutomationLane?.(trackId),
      showTrackLane: (trackId, selection) => {
        setSelections((current) => ({ ...current, [trackId]: selection }))
        const nativeTrack = props.tracks.find((track) => track.id === trackId)
        if (nativeTrack && !nativeTrack.automationVisible) props.onToggleAutomation(trackId)
      },
      hideTrackLane: (trackId) => props.onHideAutomationLane(trackId),
      resizeMasterLane: setMasterAutomationHeight,
      resizeTrackLane: (trackId, height) => setLaneHeights((current) => ({ ...current, [trackId]: height })),
      selectParameter: (ownerKey, selection) => setSelections((current) => ({ ...current, [ownerKey]: selection })),
      overrideTarget: () => {},
    },
  }))

  const sidebar = createMemo<TrackSidebarModel>(() => {
    const sourceTracksValue = tracks()
    const sourceTrackById = trackById()
    const returnsHeight = trackLayout().returnHeightPx
    return {
      tracks: sourceTracksValue,
      allTracks: sourceTracksValue,
      trackById: sourceTrackById,
      trackLayout: trackLayout(),
      scrollElement: props.scrollElement,
      selectedTrackId: props.selectedTrackId === "master" ? "" : props.selectedTrackId,
      selectedTrackIds: props.selectedTrackId === "master" ? [] : [props.selectedTrackId],
      sidebarWidth: layout.sidebarWidth,
      bottomOffsetPx: props.bottomPanelOffsetPx,
      stickyFooterHeightPx: returnsHeight + masterAreaHeight(false, masterAutomationVisible(), masterAutomationHeight()),
      master: {
        selected: props.selectedTrackId === "master",
        ready: true,
        canEditVolume: true,
        volume: props.masterVolume,
        collapsed: false,
        onClick: props.onSelectMaster,
        onToggleCollapsed: () => {},
        onVolumePreview: props.onMasterVolumeChange,
        onVolumeChange: props.onMasterVolumeChange,
      },
      onTrackClick: props.onSelectTrack,
      canWriteTrackRouting: () => true,
      onTrackSendsChange: props.onSetSends,
      onTrackOutputTargetChange: props.onSetOutputTarget,
      onVolumeChange: props.onVolumeChange,
      onSidebarPointerDown: () => {},
      onToggleMute: props.onToggleMute,
      onToggleSolo: props.onToggleSolo,
      recordArmTrackId: props.tracks.find((track) => track.armed)?.id ?? null,
      onToggleRecordArm: props.onToggleArm,
      onToggleTrackCollapsed: (trackId) => {
        const track = sourceTrackById.get(trackId)
        if (track) props.onSetCollapsed(trackId, track.collapsed !== true)
      },
      onSetTracksCollapsed: (updates) => updates.forEach((update) => props.onSetCollapsed(update.trackId, update.collapsed)),
      onGroupTracks: (ids) => props.onGroupTracks?.(ids),
      onUngroupTrack: (id) => props.onUngroupTrack?.(id),
      onMoveTrackToGroup: (id, groupId) => props.onMoveTrackToGroup?.(id, groupId),
      onReorderTracks: (ids, target) => props.onReorderTracks?.(ids, target),
      onSetTrackColor: props.onSetTrackColor,
      onResetTrackColor: (id) => props.onSetTrackColor(id, undefined),
      onAssignTrackColorToClips: props.onAssignTrackColorToClips,
      onResetClipColors: props.onResetClipColors,
      onSelectAllClipsInGroup: () => {},
      currentUserId: "native-demo-user",
      subscribeTrackLevels: () => () => {},
      subscribeMasterLevels: () => () => {},
      onVolumePreview: (id, volume) => props.onVolumeChange(id, volume),
      onDeleteTrack: props.onDeleteTrack,
    }
  })

  return <UpstreamTrackSidebar sidebar={sidebar()} automation={automation()} />
}
