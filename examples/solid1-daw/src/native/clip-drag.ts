import type { NativeClip, NativeTrack } from "./model"

export interface ClipDragSession {
  clip: NativeClip
  sourceTrackId: string
  sourceTrackIndex: number
  startX: number
  startY: number
  startSec: number
  targets: readonly NativeTrack[]
  pixelsPerSecond: number
  laneHeight: number
  gridStepSec: number | null
}

export interface ClipDragPreview {
  clip: NativeClip
  sourceTrackId: string
  targetTrackId: string
  startSec: number
}

interface StartClipDragOptions {
  tracks: readonly NativeTrack[]
  trackId: string
  clipId: string
  x: number
  y: number
  pixelsPerSecond: number
  laneHeight: number
  gridEnabled: boolean
  bpm: number
  gridDenominator: number
}

function editableTracks(tracks: readonly NativeTrack[]): NativeTrack[] {
  return tracks.filter((track) => track.kind !== "return" && track.kind !== "group")
}

function compatible(clip: NativeClip, track: NativeTrack): boolean {
  return clip.kind === "midi" ? track.kind === "midi" : track.kind === "audio"
}

function quantize(seconds: number, step: number | null): number {
  if (step === null) return Math.max(0, seconds)
  return Math.max(0, Math.round(seconds / step) * step)
}

export function startClipDrag(options: StartClipDragOptions): ClipDragSession | undefined {
  const targets = editableTracks(options.tracks)
  const sourceTrackIndex = targets.findIndex((track) => track.id === options.trackId)
  const sourceTrack = targets[sourceTrackIndex]
  const clip = sourceTrack?.clips.find((entry) => entry.id === options.clipId)
  if (!clip || sourceTrackIndex < 0) return undefined

  return {
    clip,
    sourceTrackId: sourceTrack.id,
    sourceTrackIndex,
    startX: options.x,
    startY: options.y,
    startSec: clip.startSec,
    targets,
    pixelsPerSecond: options.pixelsPerSecond,
    laneHeight: options.laneHeight,
    gridStepSec: options.gridEnabled
      ? (60 / Math.max(1, options.bpm)) * (4 / Math.max(1, options.gridDenominator))
      : null,
  }
}

export function previewClipDrag(
  session: ClipDragSession,
  x: number,
  y: number,
): ClipDragPreview {
  const laneDelta = Math.round((y - session.startY) / session.laneHeight)
  const targetIndex = Math.min(
    session.targets.length - 1,
    Math.max(0, session.sourceTrackIndex + laneDelta),
  )
  const candidate = session.targets[targetIndex]
  const source = session.targets[session.sourceTrackIndex]!
  const target = candidate && compatible(session.clip, candidate) ? candidate : source
  const seconds = session.startSec + (x - session.startX) / session.pixelsPerSecond

  return {
    clip: session.clip,
    sourceTrackId: session.sourceTrackId,
    targetTrackId: target.id,
    startSec: quantize(seconds, session.gridStepSec),
  }
}

export function commitClipDrag(
  tracks: NativeTrack[],
  preview: ClipDragPreview,
): NativeTrack[] {
  const movedClip = { ...preview.clip, startSec: preview.startSec }
  const sameTrack = preview.sourceTrackId === preview.targetTrackId
  const samePosition = movedClip.startSec === preview.clip.startSec
  if (sameTrack && samePosition) return tracks

  return tracks.map((track) => {
    if (sameTrack) {
      if (track.id !== preview.sourceTrackId) return track
      return {
        ...track,
        clips: track.clips.map((clip) => clip.id === movedClip.id ? movedClip : clip),
      }
    }

    if (track.id === preview.sourceTrackId) {
      return { ...track, clips: track.clips.filter((clip) => clip.id !== movedClip.id) }
    }
    if (track.id === preview.targetTrackId) {
      return { ...track, clips: [...track.clips, movedClip] }
    }
    return track
  })
}
