import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import type { NativeTrack } from "./model"
import { dawTheme } from "./theme"

export function sourceClip(clip: NativeTrack["clips"][number]): RuntimeClip {
  return {
    ...clip,
    color: clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio),
    sourceKind: clip.kind === "audio" ? "upload" : undefined,
    midi: clip.kind === "midi" ? { notes: [] } : undefined,
  }
}

export function sourceTrack(track: NativeTrack, tracks: readonly NativeTrack[]): Track {
  const output = tracks.find((candidate) => candidate.name === track.outputTarget)
  const sendTarget = tracks.find((candidate) => candidate.name === track.sendTarget && candidate.kind === "return")
  return {
    id: track.id,
    name: track.name,
    kind: track.kind === "midi" ? "instrument" : track.kind === "audio" ? "audio" : undefined,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips.map(sourceClip),
    groupId: track.groupId,
    outputTargetId: output?.kind === "group" ? output.id : undefined,
    sends: sendTarget && track.send > 0.0001 ? [{ targetId: sendTarget.id, amount: track.send }] : [],
    volume: track.volume,
    muted: track.muted,
    soloed: track.soloed,
  }
}

export function sourceTracks(tracks: readonly NativeTrack[]): Track[] {
  return tracks.map((track) => sourceTrack(track, tracks))
}

export function nativeOutputTargetName(tracks: readonly NativeTrack[], targetId: string | undefined): string {
  if (!targetId) return "Master"
  return tracks.find((track) => track.id === targetId)?.name ?? "Master"
}

export function renumberNativeTracks(tracks: readonly NativeTrack[]): NativeTrack[] {
  return tracks.map((track, index) => ({ ...track, number: index + 1 }))
}
