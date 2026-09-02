import type { NativeClip } from "../native/model"

export type TrackId = string
export type TrackChannelRole = "track" | "return" | "group"

export type RuntimeClip = NativeClip & {
  color: string
  midi?: { notes: Array<{ pitch: number; beat: number; length: number }> }
  mediaStatus?: "permission-denied" | "missing"
  sourceKind?: string
}

export type Clip = RuntimeClip

export interface TrackSend {
  targetId: TrackId
  amount: number
  tap?: "pre-fx" | "pre-fader" | "post-fader"
}

export interface TrackRouting {
  sends: TrackSend[]
  outputTargetId?: TrackId
}

export interface Track {
  id: TrackId
  name: string
  kind?: "audio" | "instrument"
  channelRole?: TrackChannelRole
  collapsed?: boolean
  color?: string
  clips: RuntimeClip[]
  groupId?: TrackId
  outputTargetId?: TrackId
  sends?: TrackSend[]
  volume?: number
  muted?: boolean
  soloed?: boolean
  lockedBy?: string
}
