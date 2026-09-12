import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import type { NativeClip, NativeTrack } from "./model"
import { dawTheme } from "./theme"

export function toSourceClip(clip: NativeClip): RuntimeClip {
  const runtimeClip: RuntimeClip = {
    ...clip,
    color: clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio),
  }
  if (clip.kind === "midi") runtimeClip.midi = { notes: [] }
  return runtimeClip
}

export function toSourceTrack(track: NativeTrack, hiddenClipId?: string): Track {
  return {
    id: track.id,
    name: track.name,
    volume: track.volume,
    kind: track.kind === "midi" ? "instrument" : track.kind === "audio" ? "audio" : undefined,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips
      .filter((clip) => clip.id !== hiddenClipId)
      .map(toSourceClip),
  }
}
