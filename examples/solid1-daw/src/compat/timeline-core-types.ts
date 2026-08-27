import type { NativeClip } from "../native/model"

export type TrackId = string

export type RuntimeClip = NativeClip & {
  color: string
  midi?: { notes: Array<{ pitch: number; beat: number; length: number }> }
  mediaStatus?: "permission-denied" | "missing"
}

export interface Track {
  id: TrackId
  name: string
  kind: "audio" | "instrument" | "return" | "group"
  channelRole: "track" | "return" | "group"
  collapsed?: boolean
  color?: string
  clips: RuntimeClip[]
}

export interface TrackSend {
  targetId: string
  amount: number
}
