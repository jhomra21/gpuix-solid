/**
 * Mocked project data for the video-editor timeline example.
 *
 * Everything is generated from a seeded PRNG, so a test asserting on a clip
 * name, a start time or a waveform bar gets the same answer on every machine.
 * `Math.random` here would make every screenshot and every snapshot flaky.
 */

export type ClipKind = 'video' | 'text' | 'shape' | 'audio' | 'caption'

export interface Clip {
  id: string
  trackId: string
  kind: ClipKind
  label: string
  /** Seconds from the start of the project. */
  start: number
  /** Seconds. Never below MIN_CLIP_DURATION. */
  duration: number
}

export interface Track {
  id: string
  name: string
  kind: ClipKind
  /** Audio tracks paint a waveform and are taller. */
  tall: boolean
}

export interface Project {
  name: string
  durationSeconds: number
  tracks: Track[]
  clips: Clip[]
  /** One 0..1 amplitude per 1/8 second of the project, for audio tracks. */
  waveform: number[]
}

export const MIN_CLIP_DURATION = 0.4
export const WAVEFORM_HZ = 8

/** Mulberry32. Small, fast, and identical in every JavaScript runtime. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CAPTION_LINES = [
  'We are introducing text animations',
  'Two weeks ago',
  'Word by word, beat by beat.',
  'Every word every line. Move them.',
  'Let us goooooooooooo!',
  'Do it again',
  'One more take',
]

const CLIP_LABELS = [
  'Rectangle',
  'Letterbox',
  'Title card',
  'Lower third',
  'B-roll',
  'Transition',
  'Overlay',
  'Logo sting',
]

const AUDIO_LABELS = [
  'ZOOM0211.WAV',
  'artlist_warm_strings_loop.WAV',
  'room_tone.WAV',
  'foley_steps.WAV',
]

export interface ProjectOptions {
  /** Video and text tracks. One caption track and one audio track are added. */
  trackCount?: number
  durationSeconds?: number
  seed?: number
}

export function createProject(options: ProjectOptions = {}): Project {
  const trackCount = options.trackCount ?? 10
  const durationSeconds = options.durationSeconds ?? 230
  const random = seededRandom(options.seed ?? 0x5eed)

  const tracks: Track[] = [{ id: 'caption', name: 'Caption', kind: 'caption', tall: false }]
  for (let index = trackCount; index >= 1; index -= 1) {
    tracks.push({
      id: `track-${index}`,
      name: `Track ${index}`,
      kind: index > trackCount - 2 ? 'shape' : index % 3 === 0 ? 'video' : 'text',
      tall: false,
    })
  }
  tracks.push({ id: 'audio-1', name: 'Audio 1', kind: 'audio', tall: true })

  const clips: Clip[] = []
  let nextClipId = 1

  for (const track of tracks) {
    // Full-width letterbox bars on the two shape tracks, a scattered layout
    // everywhere else. Both shapes appear in a real edit and they stress
    // different parts of the layout: one very wide clip, or many small ones.
    if (track.kind === 'shape') {
      clips.push({
        id: `clip-${nextClipId++}`,
        trackId: track.id,
        kind: 'shape',
        label: `${CLIP_LABELS[clips.length % CLIP_LABELS.length]} - ${track.name}`,
        start: 0,
        duration: durationSeconds,
      })
      continue
    }

    let cursor = random() * 6
    while (cursor < durationSeconds) {
      const duration =
        track.kind === 'audio'
          ? 24 + random() * 40
          : track.kind === 'caption'
            ? 1.2 + random() * 2.6
            : 1.5 + random() * 7
      if (cursor + duration > durationSeconds) break
      const labels =
        track.kind === 'audio'
          ? AUDIO_LABELS
          : track.kind === 'caption'
            ? CAPTION_LINES
            : CLIP_LABELS
      clips.push({
        id: `clip-${nextClipId++}`,
        trackId: track.id,
        kind: track.kind,
        label: `${labels[nextClipId % labels.length]}${
          track.kind === 'caption' || track.kind === 'audio' ? '' : ` ${nextClipId % 9}`
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

  return { name: 'Diffusion Studio Pro', durationSeconds, tracks, clips, waveform }
}

export function formatTimecode(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const whole = Math.floor(clamped)
  const frames = Math.floor((clamped - whole) * 25)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad(rest)}:${pad(frames)}`
}

/** Ruler label step in seconds, chosen so labels stay about 90px apart. */
export function tickStep(pxPerSecond: number): number {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  for (const candidate of candidates) {
    if (candidate * pxPerSecond >= 90) return candidate
  }
  return candidates[candidates.length - 1]
}
