import assert from "node:assert/strict"
import { DEFAULT_PIXELS_PER_SECOND } from "../src/compat/timeline-view"
import { commitClipDrag, previewClipDrag, startClipDrag } from "../src/native/clip-drag"
import { initialTracks } from "../src/native/model"
import { layout } from "../src/native/theme"

const tracks = initialTracks.map((track) => ({ ...track, clips: [...track.clips] }))
const drums = tracks.find((track) => track.id === "drums")!
const originalClip = drums.clips.find((clip) => clip.id === "drums-a")!
const session = startClipDrag({
  tracks,
  trackId: drums.id,
  clipId: originalClip.id,
  x: 100,
  y: 100,
  pixelsPerSecond: DEFAULT_PIXELS_PER_SECOND,
  laneHeight: layout.laneHeight,
  gridEnabled: false,
  bpm: 120,
  gridDenominator: 4,
})
assert.ok(session)

const preview = previewClipDrag(session, 140, 100)
assert.equal(preview.startSec, originalClip.startSec + 0.4)
assert.equal(preview.targetTrackId, drums.id)
assert.equal(
  drums.clips.find((clip) => clip.id === originalClip.id),
  originalClip,
  "previewing a drag must leave the source clip untouched",
)

const concurrentTracks = tracks.map((track) => track.id === drums.id
  ? {
      ...track,
      clips: track.clips.map((clip) => clip.id === originalClip.id
        ? { ...clip, gain: 0.75 }
        : clip),
    }
  : track)
const committed = commitClipDrag(concurrentTracks, preview)
const committedDrums = committed.find((track) => track.id === drums.id)!
const committedClip = committedDrums.clips.find((clip) => clip.id === originalClip.id)!
assert.equal(committedClip.startSec, preview.startSec)
assert.equal(committedClip.gain, 0.75, "commit must preserve fields changed after pointer-down")
assert.notEqual(committedDrums, concurrentTracks.find((track) => track.id === drums.id))
for (const track of concurrentTracks) {
  if (track.id === drums.id) continue
  assert.equal(
    committed.find((candidate) => candidate.id === track.id),
    track,
    `unaffected track ${track.id} should preserve identity`,
  )
}

const crossTrackPreview = previewClipDrag(session, 140, 100 + layout.laneHeight)
assert.equal(crossTrackPreview.targetTrackId, "bass")

const withoutTarget = concurrentTracks.filter((track) => track.id !== crossTrackPreview.targetTrackId)
assert.equal(
  commitClipDrag(withoutTarget, crossTrackPreview),
  withoutTarget,
  "a removed target track must cancel the commit without removing the source clip",
)
assert.ok(
  withoutTarget.find((track) => track.id === drums.id)?.clips.some((clip) => clip.id === originalClip.id),
)

const incompatibleTarget = concurrentTracks.map((track) => track.id === crossTrackPreview.targetTrackId
  ? { ...track, kind: "midi" as const }
  : track)
assert.equal(
  commitClipDrag(incompatibleTarget, crossTrackPreview),
  incompatibleTarget,
  "a target that became incompatible must cancel the commit",
)

const noOpPreview = previewClipDrag(session, session.startX, session.startY)
assert.equal(
  commitClipDrag(tracks, noOpPreview),
  tracks,
  "a no-op drag should preserve the project array",
)

console.log("solid1 DAW clip drag model: transient preview and minimal commit passed")
