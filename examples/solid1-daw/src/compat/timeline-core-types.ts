import type { Clip as CoreClip, Track as CoreTrack } from "../upstream/packages/timeline-core/types"

export type { TrackId, TrackChannelRole, TrackSend, TrackRouting } from "../upstream/packages/timeline-core/types"
export type RuntimeClip = CoreClip<AudioBuffer>
export type Clip = RuntimeClip
export type Track = CoreTrack<AudioBuffer>
