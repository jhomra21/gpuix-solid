/** Deterministic project data for the published GPUIX video-editor timeline. */

export type ClipKind = "video" | "text" | "shape" | "audio" | "caption"

export interface Clip {
  id: string
  trackId: string
  kind: ClipKind
  label: string
  start: number
  duration: number
}

export interface Track {
  id: string
  name: string
  kind: ClipKind
  tall: boolean
}

export interface Project {
  name: string
  durationSeconds: number
  tracks: Track[]
  clips: Clip[]
  waveform: number[]
}

export const MIN_CLIP_DURATION = 0.4
export const WAVEFORM_HZ = 8

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const CAPTION_LINES = [
  "We are introducing text animations",
  "Two weeks ago",
  "Word by word, beat by beat.",
  "Every word every line. Move them.",
  "Let us goooooooooooo!",
  "Do it again",
  "One more take",
]

const CLIP_LABELS = [
  "Rectangle",
  "Letterbox",
  "Title card",
  "Lower third",
  "B-roll",
  "Transition",
  "Overlay",
  "Logo sting",
]

const AUDIO_LABELS = [
  "ZOOM0211.WAV",
  "artlist_warm_strings_loop.WAV",
  "room_tone.WAV",
  "foley_steps.WAV",
]

export interface ProjectOptions {
  trackCount?: number
  durationSeconds?: number
  seed?: number
}

export function createProject(options: ProjectOptions = {}): Project {
  const trackCount = options.trackCount ?? 10
  const durationSeconds = options.durationSeconds ?? 230
  const random = seededRandom(options.seed ?? 0x5eed)

  const tracks: Track[] = [
    { id: "caption", name: "Caption", kind: "caption", tall: false },
  ]
  for (let index = trackCount; index >= 1; index -= 1) {
    tracks.push({
      id: `track-${index}`,
      name: `Track ${index}`,
      kind: index > trackCount - 2 ? "shape" : index % 3 === 0 ? "video" : "text",
      tall: false,
    })
  }
  tracks.push({ id: "audio-1", name: "Audio 1", kind: "audio", tall: true })

  const clips: Clip[] = []
  let nextClipId = 1

  for (const track of tracks) {
    if (track.kind === "shape") {
      clips.push({
        id: `clip-${nextClipId++}`,
        trackId: track.id,
        kind: "shape",
        label: `${CLIP_LABELS[clips.length % CLIP_LABELS.length]} - ${track.name}`,
        start: 0,
        duration: durationSeconds,
      })
      continue
    }

    let cursor = random() * 6
    while (cursor < durationSeconds) {
      const duration =
        track.kind === "audio"
          ? 24 + random() * 40
          : track.kind === "caption"
            ? 1.2 + random() * 2.6
            : 1.5 + random() * 7
      if (cursor + duration > durationSeconds) break
      const labels =
        track.kind === "audio"
          ? AUDIO_LABELS
          : track.kind === "caption"
            ? CAPTION_LINES
            : CLIP_LABELS
      clips.push({
        id: `clip-${nextClipId++}`,
        trackId: track.id,
        kind: track.kind,
        label: `${labels[nextClipId % labels.length]}${
          track.kind === "caption" || track.kind === "audio" ? "" : ` ${nextClipId % 9}`
        }`,
        start: Number(cursor.toFixed(3)),
        duration: Number(duration.toFixed(3)),
      })
      cursor += duration + random() * 3
    }
  }

  const waveform: number[] = []
  for (let index = 0; index < durationSeconds * WAVEFORM_HZ; index += 1) {
    const envelope = 0.35 + 0.45 * Math.abs(Math.sin(index / 37))
    waveform.push(Math.min(1, envelope * (0.5 + random() * 0.7)))
  }

  return { name: "Diffusion Studio Pro", durationSeconds, tracks, clips, waveform }
}

export function formatTimecode(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const whole = Math.floor(clamped)
  const frames = Math.floor((clamped - whole) * 25)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad(rest)}:${pad(frames)}`
}

export function tickStep(pxPerSecond: number): number {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  for (const candidate of candidates) {
    if (candidate * pxPerSecond >= 90) return candidate
  }
  return candidates[candidates.length - 1]!
}
