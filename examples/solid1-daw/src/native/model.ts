export type TrackKind = "audio" | "midi" | "return" | "group"
export type BrowserTab = "assets" | "effects" | "midi-instruments"
export type BottomTab = "effects" | "clip"

export interface NativeClip {
  id: string
  name: string
  kind: "audio" | "midi"
  startSec: number
  duration: number
  color?: string
  waveform: number[]
}

export interface NativeTrack {
  id: string
  name: string
  kind: TrackKind
  number: number
  color?: string
  volume: number
  pan: number
  send: number
  muted: boolean
  soloed: boolean
  armed: boolean
  collapsed?: boolean
  outputTarget: string
  sendTarget: string
  clips: NativeClip[]
}

export interface BrowserTreeItem {
  id: string
  label: string
  subtitle?: string
}

export interface BrowserSection {
  id: string
  label: string
  items: BrowserTreeItem[]
}

export const initialTracks: NativeTrack[] = [
  {
    id: "drums",
    number: 1,
    name: "Drums",
    kind: "audio",
    color: "#d97757",
    volume: 0.86,
    pan: 0,
    send: 0.08,
    muted: false,
    soloed: false,
    armed: false,
    outputTarget: "Master",
    sendTarget: "A-Reverb",
    clips: [
      { id: "drums-a", name: "Drum Loop 01", kind: "audio", startSec: 0.7, duration: 2.2, color: "#00a76c", waveform: [0.3,0.7,0.5,0.85,0.4,0.9,0.55,0.72,0.45,0.82,0.65,0.4,0.75,0.55,0.88,0.42] },
      { id: "drums-b", name: "Drum Loop 02", kind: "audio", startSec: 3.15, duration: 2.0, color: "#00a76c", waveform: [0.5,0.8,0.35,0.72,0.65,0.9,0.42,0.75,0.6,0.84,0.48,0.7,0.38,0.8,0.52] },
    ],
  },
  {
    id: "bass",
    number: 2,
    name: "Bass",
    kind: "audio",
    color: "#5aa37f",
    volume: 0.78,
    pan: 0,
    send: 0.18,
    muted: false,
    soloed: false,
    armed: false,
    outputTarget: "Master",
    sendTarget: "A-Reverb",
    clips: [
      { id: "bass-a", name: "Bass Verse", kind: "audio", startSec: 1.35, duration: 2.75, color: "#5aa37f", waveform: [0.45,0.72,0.5,0.66,0.82,0.38,0.75,0.56,0.7,0.44,0.78,0.6,0.52,0.74] },
    ],
  },
  {
    id: "synth",
    number: 3,
    name: "Synth",
    kind: "midi",
    color: "#5f83c7",
    volume: 0.72,
    pan: -12,
    send: 0.34,
    muted: false,
    soloed: false,
    armed: true,
    outputTarget: "Master",
    sendTarget: "A-Reverb",
    clips: [
      { id: "synth-a", name: "MIDI · Glass Pad", kind: "midi", startSec: 2.0, duration: 3.4, color: "#0089ed", waveform: [0.22,0.56,0.44,0.8,0.5,0.68,0.34,0.72,0.48,0.62,0.4,0.76,0.58,0.7] },
    ],
  },
  {
    id: "vocals",
    number: 4,
    name: "Vocals",
    kind: "audio",
    color: "#8d6ab7",
    volume: 0.8,
    pan: 6,
    send: 0.24,
    muted: false,
    soloed: false,
    armed: false,
    outputTarget: "Master",
    sendTarget: "A-Reverb",
    clips: [
      { id: "vocals-a", name: "Lead Vocal", kind: "audio", startSec: 0.9, duration: 1.75, color: "#8d6ab7", waveform: [0.35,0.7,0.48,0.85,0.6,0.3,0.74,0.5,0.68,0.8,0.42,0.66] },
      { id: "vocals-b", name: "Hook Comp", kind: "audio", startSec: 3.55, duration: 2.05, color: "#8d6ab7", waveform: [0.54,0.32,0.75,0.65,0.38,0.82,0.56,0.7,0.4,0.78,0.62,0.46,0.72] },
    ],
  },
  {
    id: "return-a",
    number: 5,
    name: "A-Reverb",
    kind: "return",
    color: "#a58b54",
    volume: 0.66,
    pan: 0,
    send: 0,
    muted: false,
    soloed: false,
    armed: false,
    outputTarget: "Master",
    sendTarget: "None",
    clips: [],
  },
]

export const browserSections: Record<BrowserTab, BrowserSection[]> = {
  assets: [
    {
      id: "project-samples",
      label: "PROJECT SAMPLES",
      items: [
        { id: "kick-tight", label: "Kick · Tight 04", subtitle: "One-shot" },
        { id: "hat-dry", label: "Hi-Hat · Dry 12", subtitle: "One-shot" },
        { id: "vocal-air", label: "Vocal Air 118", subtitle: "Loop" },
      ],
    },
    {
      id: "factory-library",
      label: "FACTORY LIBRARY",
      items: [
        { id: "glass-hit", label: "Glass Hit", subtitle: "One-shot" },
        { id: "room-tone", label: "Room Tone", subtitle: "Texture" },
      ],
    },
  ],
  effects: [
    {
      id: "audio-effects",
      label: "AUDIO EFFECTS",
      items: [
        { id: "compressor", label: "Compressor", subtitle: "Dynamics" },
        { id: "eq-eight", label: "EQ Eight", subtitle: "EQ & Filters" },
        { id: "reverb", label: "Reverb", subtitle: "Space" },
        { id: "delay", label: "Delay", subtitle: "Delay" },
      ],
    },
  ],
  "midi-instruments": [
    {
      id: "instruments",
      label: "INSTRUMENTS",
      items: [
        { id: "analog", label: "Analog", subtitle: "Synth" },
        { id: "wavetable", label: "Wavetable", subtitle: "Synth" },
        { id: "drum-rack", label: "Drum Rack", subtitle: "Drums" },
      ],
    },
  ],
}
