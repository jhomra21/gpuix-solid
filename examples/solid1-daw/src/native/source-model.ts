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

// ArrangementOverview only reads row role plus clip geometry/color. Preserve the
// last translated Track[] when mixer/sidebar-only fields change so collapsing,
// muting, soloing, or changing volume cannot wake the overview SVG.
export function sameArrangementOverviewTracks(
  previous: readonly Track[],
  next: readonly Track[],
): boolean {
  if (previous === next) return true
  if (previous.length !== next.length) return false

  for (let trackIndex = 0; trackIndex < previous.length; trackIndex++) {
    const left = previous[trackIndex]
    const right = next[trackIndex]
    if (left.id !== right.id || left.channelRole !== right.channelRole || left.clips.length !== right.clips.length) {
      return false
    }

    for (let clipIndex = 0; clipIndex < left.clips.length; clipIndex++) {
      const leftClip = left.clips[clipIndex]
      const rightClip = right.clips[clipIndex]
      if (
        leftClip.id !== rightClip.id ||
        leftClip.startSec !== rightClip.startSec ||
        leftClip.duration !== rightClip.duration ||
        leftClip.color !== rightClip.color
      ) {
        return false
      }
    }
  }

  return true
}
