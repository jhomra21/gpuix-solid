import { createEffect, createMemo, createSignal, type JSX } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { automationTargetKey, type AutomationParameterSelection } from "../compat/daw-browser-shared"
import type { TimelineWorkspaceAutomationModel } from "../compat/useTimelineAutomationController"
import type { Track, TrackSend } from "../compat/timeline-core-types"
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

function sameBooleanRecord(
  previous: Record<string, boolean>,
  next: Record<string, boolean>,
): boolean {
  const keys = Object.keys(next)
  if (keys.length !== Object.keys(previous).length) return false
  return keys.every((key) => previous[key] === next[key])
}

function sameStringArrayRecord(
  previous: Record<string, string[]>,
  next: Record<string, string[]>,
): boolean {
  const keys = Object.keys(next)
  if (keys.length !== Object.keys(previous).length) return false
  return keys.every((key) => {
    const left = previous[key]
    const right = next[key]
    if (!left || left.length !== right.length) return false
    return right.every((value, index) => left[index] === value)
  })
}

function sameSelectionRecord(
  previous: Record<string, AutomationParameterSelection>,
  next: Record<string, AutomationParameterSelection>,
): boolean {
  const keys = Object.keys(next)
  if (keys.length !== Object.keys(previous).length) return false
  return keys.every((key) => {
    const left = previous[key]
    const right = next[key]
    return left?.parameterId === right.parameterId && left.effectInstanceId === right.effectInstanceId
  })
}

export default function SourceTrackSidebar(props: SourceTrackSidebarProps): JSX.Element {
  const [laneHeights, setLaneHeights] = createSignal<Record<string, number>>({})
  const [selections, setSelections] = createSignal<Record<string, AutomationParameterSelection>>({})
  const [masterAutomationVisible, setMasterAutomationVisible] = createSignal(false)
  const [masterAutomationHeight, setMasterAutomationHeight] = createSignal(48)
  const [sourceTrackStore, setSourceTrackStore] = createStore<{ tracks: Track[] }>({
    tracks: sourceTracks(props.tracks),
  })

  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
  })

  const tracks = () => sourceTrackStore.tracks
  const trackById = createMemo(() => new Map(tracks().map((track) => [track.id, track])))
  const visibleByTrackId = createMemo<Record<string, boolean>>(
    () => Object.fromEntries(props.tracks.map((track) => [track.id, track.automationVisible])),
    {},
    { equals: sameBooleanRecord },
  )
  const visibleTargetKeysByTrackId = createMemo<Record<string, string[]>>(
    () => Object.fromEntries(props.tracks.map((track) => [
      track.id,
      track.automationVisible
        ? [automationTargetKey({ kind: "track", trackId: track.id }, "volume")]
        : [],
    ])),
    {},
    { equals: sameStringArrayRecord },
  )
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

  const selectedTargetsByOwnerKey = createMemo<Record<string, AutomationParameterSelection>>(
    () => ({
      master: selections().master ?? { parameterId: "volume" },
      ...Object.fromEntries(tracks().map((track) => [
        track.id,
        selections()[track.id] ?? { parameterId: "volume" },
      ])),
    }),
    {},
    { equals: sameSelectionRecord },
  )
  const effectInstancesByOwnerKey = createMemo(() => Object.fromEntries([
    ["master", []],
    ...tracks().map((track) => [track.id, []]),
  ]))
  const emptySelectionByTargetKey = new Map()
  const emptyEvaluatedValuesByTargetKey = new Map()
  const emptyEnvelopesByTargetKey = new Map()

  // Keep the adapter models stable. The copied TrackSidebar has many fine-grained
  // memos that read individual model fields; replacing the whole model object on
  // a collapse makes all of those consumers wake at once. Getter-backed models
  // preserve source behavior while subscribing each consumer only to the field it
  // actually reads.
  const automation: TimelineWorkspaceAutomationModel = {
    projectId: "native-source-first-demo",
    lanes: {
      get visibleByTrackId() { return visibleByTrackId() },
      get visibleTargetKeysByTrackId() { return visibleTargetKeysByTrackId() },
      get heightsByLaneOwnerKey() { return laneHeights() },
      get masterVisible() { return masterAutomationVisible() },
      get masterHeight() { return masterAutomationHeight() },
      get selectedTargetsByOwnerKey() { return selectedTargetsByOwnerKey() },
      selectionByTargetKey: emptySelectionByTargetKey,
      get effectInstancesByOwnerKey() { return effectInstancesByOwnerKey() },
    },
    evaluatedValuesByTargetKey: () => emptyEvaluatedValuesByTargetKey,
    envelopes: {
      byTargetKey: emptyEnvelopesByTargetKey,
      preview: () => {},
      commit: () => {},
      cancelPreview: () => {},
    },
    actions: {
      toggleMasterVisibility: () => setMasterAutomationVisible((visible) => !visible),
      toggleTrackVisibility: (trackId) => props.onToggleAutomation(trackId),
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
  }

  const master: TrackSidebarModel["master"] = {
    get selected() { return props.selectedTrackId === "master" },
    ready: true,
    canEditVolume: true,
    get volume() { return props.masterVolume },
    collapsed: false,
    onClick: () => props.onSelectMaster(),
    onToggleCollapsed: () => {},
    onVolumePreview: (value) => props.onMasterVolumeChange(value),
    onVolumeChange: (value) => props.onMasterVolumeChange(value),
  }

  const sidebar: TrackSidebarModel = {
    get tracks() { return tracks() },
    get allTracks() { return tracks() },
    get trackById() { return trackById() },
    get trackLayout() { return trackLayout() },
    scrollElement: () => props.scrollElement(),
    get selectedTrackId() { return props.selectedTrackId === "master" ? "" : props.selectedTrackId },
    get selectedTrackIds() { return props.selectedTrackId === "master" ? [] : [props.selectedTrackId] },
    sidebarWidth: layout.sidebarWidth,
    get bottomOffsetPx() { return props.bottomPanelOffsetPx },
    get stickyFooterHeightPx() {
      return trackLayout().returnHeightPx + masterAreaHeight(false, masterAutomationVisible(), masterAutomationHeight())
    },
    master,
    onTrackClick: (id) => props.onSelectTrack(id),
    canWriteTrackRouting: () => true,
    onTrackSendsChange: (id, sends) => props.onSetSends(id, sends),
    onTrackOutputTargetChange: (id, targetId) => props.onSetOutputTarget(id, targetId),
    onVolumeChange: (id, value) => props.onVolumeChange(id, value),
    onSidebarPointerDown: () => {},
    onToggleMute: (id) => props.onToggleMute(id),
    onToggleSolo: (id) => props.onToggleSolo(id),
    get recordArmTrackId() { return props.tracks.find((track) => track.armed)?.id ?? null },
    onToggleRecordArm: (trackId) => {
      const currentArmedId = props.tracks.find((track) => track.armed)?.id
      if (currentArmedId && currentArmedId !== trackId) props.onToggleArm(currentArmedId)
      props.onToggleArm(trackId)
    },
    onToggleTrackCollapsed: (trackId) => {
      const track = trackById().get(trackId)
      if (track) props.onSetCollapsed(trackId, track.collapsed !== true)
    },
    onSetTracksCollapsed: (updates) => updates.forEach((update) => props.onSetCollapsed(update.trackId, update.collapsed)),
    onGroupTracks: (ids) => props.onGroupTracks?.(ids),
    onUngroupTrack: (id) => props.onUngroupTrack?.(id),
    onMoveTrackToGroup: (id, groupId) => props.onMoveTrackToGroup?.(id, groupId),
    onReorderTracks: (ids, target) => props.onReorderTracks?.(ids, target),
    onSetTrackColor: (id, color) => props.onSetTrackColor(id, color),
    onResetTrackColor: (id) => props.onSetTrackColor(id, undefined),
    onAssignTrackColorToClips: (id) => props.onAssignTrackColorToClips(id),
    onResetClipColors: (id) => props.onResetClipColors(id),
    onSelectAllClipsInGroup: () => {},
    currentUserId: "native-demo-user",
    subscribeTrackLevels: () => () => {},
    subscribeMasterLevels: () => () => {},
    onVolumePreview: (id, volume) => props.onVolumeChange(id, volume),
    onDeleteTrack: (id) => props.onDeleteTrack(id),
  }

  return <UpstreamTrackSidebar sidebar={sidebar} automation={automation} />
}
