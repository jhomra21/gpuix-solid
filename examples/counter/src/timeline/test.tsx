import assert from "node:assert/strict"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type TestRoot,
} from "gpuix-solid"
import {
  FOOTER_HEIGHT,
  HEADER_WIDTH,
  RULER_HEIGHT,
  TimelineApp,
  trackHeight,
} from "./app"
import { createProject, type Clip } from "./data"

const REQUESTED = { width: 1280, height: 800 }
const TRACK_COUNT = 12
const PX_PER_SECOND = 24
const project = createProject({ trackCount: TRACK_COUNT })

function grantedViewport() {
  if (!hasNativeTestRenderer) return REQUESTED
  const probe = createTestRoot(REQUESTED.width, REQUESTED.height)
  try {
    return probe.renderer.getWindowSize()
  } finally {
    probe.unmount()
  }
}

const { width: WIDTH, height: HEIGHT } = grantedViewport()
const contentHeight = project.tracks.reduce(
  (total, track) => total + trackHeight(track),
  0,
)
const bodyHeight = Math.max(120, Math.min(contentHeight, Math.round(HEIGHT * 0.42)))
const panelHeight = RULER_HEIGHT + bodyHeight + FOOTER_HEIGHT
const GRID_TOP = HEIGHT - panelHeight + RULER_HEIGHT
const GRID_CENTER = {
  x: HEADER_WIDTH + 400,
  y: GRID_TOP + Math.round(bodyHeight / 2),
}
const RULER_POINT = {
  x: HEADER_WIDTH + 400,
  y: HEIGHT - panelHeight + RULER_HEIGHT / 2,
}

function rowCenterY(trackId: string): number {
  let top = 0
  for (const track of project.tracks) {
    const height = trackHeight(track)
    if (track.id === trackId) return GRID_TOP + top + height / 2
    top += height
  }
  throw new Error(`Unknown track ${trackId}`)
}

function emptyPointOn(trackId: string) {
  const clips = project.clips
    .filter((clip) => clip.trackId === trackId)
    .sort((a, b) => a.start - b.start)
  for (let index = 0; index + 1 < clips.length; index += 1) {
    const current = clips[index]
    const next = clips[index + 1]
    if (!current || !next) continue
    const gapStart = current.start + current.duration
    const gapEnd = next.start
    const middle = (gapStart + gapEnd) / 2
    if ((gapEnd - gapStart) * PX_PER_SECOND > 12 && middle * PX_PER_SECOND < 900) {
      return { x: HEADER_WIDTH + middle * PX_PER_SECOND, y: rowCenterY(trackId) }
    }
  }
  throw new Error(`No visible gap on ${trackId}`)
}

function mount(measureWindow = false): TestRoot {
  const root = createTestRoot(WIDTH, HEIGHT)
  root.render(() =>
    measureWindow ? (
      <TimelineApp trackCount={TRACK_COUNT} />
    ) : (
      <TimelineApp
        trackCount={TRACK_COUNT}
        viewportWidth={WIDTH}
        viewportHeight={HEIGHT}
      />
    ),
  )
  return root
}

async function readout(app: App): Promise<Record<string, string>> {
  const text = await app.getByTestId("readout").textContent()
  const result: Record<string, string> = {}
  for (const pair of text.split(" ")) {
    const separator = pair.indexOf("=")
    if (separator < 0) continue
    result[pair.slice(0, separator)] = pair.slice(separator + 1)
  }
  return result
}

interface SelectionReadout {
  id: string
  trackId: string
  start: number
  duration: number
}

async function selectionOf(app: App): Promise<SelectionReadout | null> {
  const text = await app.getByTestId("selection").textContent()
  if (text === "none") return null
  const [id, trackId, start, duration] = text.split(" ")
  if (!id || !trackId || start === undefined || duration === undefined) {
    throw new Error(`Invalid timeline selection readout: ${text}`)
  }
  return { id, trackId, start: Number(start), duration: Number(duration) }
}

const VISIBLE_TRACKS = (() => {
  const ids: string[] = []
  let top = 0
  for (const track of project.tracks) {
    const height = trackHeight(track)
    if (top + height <= bodyHeight) ids.push(track.id)
    top += height
  }
  return ids
})()

function hasDraggableClip(trackId: string): boolean {
  return project.clips.some(
    (clip) =>
      clip.trackId === trackId &&
      clip.start > 1 &&
      clip.start < 12 &&
      clip.duration > 3 &&
      clip.duration < 20,
  )
}

function adjacentUsableTracks(): [string, string] {
  const usable = VISIBLE_TRACKS.filter(hasDraggableClip)
  for (const id of usable) {
    const index = VISIBLE_TRACKS.indexOf(id)
    const next = VISIBLE_TRACKS[index + 1]
    if (next && usable.includes(next)) return [id, next]
  }
  throw new Error("No adjacent pair of usable timeline tracks")
}

const [TOP_TRACK, SECOND_TRACK] = adjacentUsableTracks()

function pickClip(trackId: string): Clip {
  const clip = project.clips.find(
    (candidate) =>
      candidate.trackId === trackId &&
      candidate.start > 1 &&
      candidate.start < 12 &&
      candidate.duration > 3 &&
      candidate.duration < 20,
  )
  if (!clip) throw new Error(`No suitable clip on ${trackId}`)
  return clip
}

function assertClose(
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`,
  )
}

async function close(root: TestRoot, app: App): Promise<void> {
  await app.close()
  root.unmount()
}

async function paintsTimeline(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const painted = root.renderer.getPaintedText()
    assert.ok(painted.includes("Track 1"))
    assert.ok(painted.includes("Caption"))
    assert.ok(painted.includes("Audio 1"))
    assert.ok(painted.includes("0"))
    const state = await readout(app)
    assert.equal(state.x, "0")
    assert.equal(state.y, "0")
    assert.equal(state.pps, "24.00")
  } finally {
    await close(root, app)
  }
}

async function pansBothAxes(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    await app.mouse.wheel(GRID_CENTER, 0, -60)
    let state = await readout(app)
    assert.equal(state.x, "0")
    assert.equal(state.y, "60")

    await app.mouse.wheel(GRID_CENTER, -140, 0)
    state = await readout(app)
    assert.equal(state.x, "140")
    assert.equal(state.y, "60")

    await app.mouse.wheel(GRID_CENTER, 0, -35, { modifiers: "shift" })
    state = await readout(app)
    assert.equal(state.x, "175")
    assert.equal(state.y, "60")
  } finally {
    await close(root, app)
  }
}

async function keepsFrozenPanesAligned(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    const before = await app.getByTestId(`clip-${clip.id}`).bounds()
    const headerBefore = await app.getByTestId(`track-header-${TOP_TRACK}`).bounds()
    const playheadBefore = await app.getByTestId("timeline-playhead").bounds()

    await app.mouse.wheel(GRID_CENTER, -120, -40)

    const after = await app.getByTestId(`clip-${clip.id}`).bounds()
    const headerAfter = await app.getByTestId(`track-header-${TOP_TRACK}`).bounds()
    const playheadAfter = await app.getByTestId("timeline-playhead").bounds()
    assert.equal(Math.round(before.x - after.x), 120)
    assert.equal(Math.round(playheadBefore.x - playheadAfter.x), 120)
    assert.equal(Math.round(before.y - after.y), 40)
    assert.equal(Math.round(headerBefore.y - headerAfter.y), 40)
  } finally {
    await close(root, app)
  }
}

async function clampsPan(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    await app.mouse.wheel(GRID_CENTER, 900, 900)
    let state = await readout(app)
    assert.equal(state.x, "0")
    assert.equal(state.y, "0")

    await app.mouse.wheel(GRID_CENTER, -99_999, -99_999)
    state = await readout(app)
    const contentWidth = project.durationSeconds * PX_PER_SECOND
    assert.equal(Number(state.x), Math.round(contentWidth - (WIDTH - HEADER_WIDTH)))
    assert.equal(Number(state.y), Math.round(contentHeight - bodyHeight))
  } finally {
    await close(root, app)
  }
}

async function scrollsMediaBinNatively(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const element = await app.getByTestId("media-bin").element()
    assert.deepEqual(root.renderer.getScrollOffset(element.id), [0, 0])
    await app.getByTestId("media-bin").wheel(-60, -40)
    const offset = root.renderer.getScrollOffset(element.id)
    assert.ok(offset, "native media-bin scroll offset should be available")
    assert.ok(offset[0] < 0, `expected negative x scroll offset, got ${offset[0]}`)
    assert.ok(offset[1] < 0, `expected negative y scroll offset, got ${offset[1]}`)
  } finally {
    await close(root, app)
  }
}

async function movesClipInTime(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}`).dragBy(120, 0, { steps: 6 })
    const moved = await selectionOf(app)
    assert.ok(moved)
    assert.equal(moved.id, clip.id)
    assert.equal(moved.trackId, TOP_TRACK)
    assertClose(moved.start, clip.start + 5, 0.6, "clip move start")
    assertClose(moved.duration, clip.duration, 0.11, "clip move duration")
    assert.equal(
      await app.getByTestId("events").textContent(),
      `dragstart:move:${clip.id} dragend:move`,
    )
  } finally {
    await close(root, app)
  }
}

async function movesClipAcrossTracks(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(SECOND_TRACK)
    const rows = project.tracks.map((track) => track.id)
    const from = rows.indexOf(SECOND_TRACK)
    const destination = rows[from + 1]
    if (!destination) throw new Error("Expected a destination track below the source")

    await app.getByTestId(`clip-${clip.id}`).dragBy(0, 34, { steps: 4 })
    const moved = await selectionOf(app)
    assert.ok(moved)
    assert.equal(moved.trackId, destination)
    assertClose(moved.start, clip.start, 0.11, "cross-track move start")
  } finally {
    await close(root, app)
  }
}

async function keepsHorizontalDragOnTrack(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}`).dragBy(90, 0, { steps: 4 })
    assert.equal((await selectionOf(app))?.trackId, TOP_TRACK)
  } finally {
    await close(root, app)
  }
}

async function measuresGrantedWindow(): Promise<void> {
  const root = mount(true)
  const app = createTestApp(root.renderer)
  try {
    assert.deepEqual(root.renderer.getWindowSize(), { width: WIDTH, height: HEIGHT })
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}`).dragBy(72, 0, { steps: 4 })
    const moved = await selectionOf(app)
    assert.ok(moved)
    assert.equal(moved.trackId, TOP_TRACK)
    assertClose(moved.start, clip.start + 3, 0.6, "self-measured clip move")
  } finally {
    await close(root, app)
  }
}

async function trimsStart(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}-trim-start`).dragBy(48, 0, { steps: 4 })
    const trimmed = await selectionOf(app)
    assert.ok(trimmed)
    assertClose(trimmed.start, clip.start + 2, 0.6, "trim-start start")
    assertClose(
      trimmed.start + trimmed.duration,
      clip.start + clip.duration,
      0.11,
      "trim-start end",
    )
    assert.equal(
      await app.getByTestId("events").textContent(),
      `dragstart:trim-start:${clip.id} dragend:trim-start`,
    )
  } finally {
    await close(root, app)
  }
}

async function trimsEnd(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}-trim-end`).dragBy(48, 0, { steps: 4 })
    const trimmed = await selectionOf(app)
    assert.ok(trimmed)
    assertClose(trimmed.start, clip.start, 0.11, "trim-end start")
    assertClose(trimmed.duration, clip.duration + 2, 0.6, "trim-end duration")
  } finally {
    await close(root, app)
  }
}

async function snapsTrimEdge(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    const neighbour = project.clips.find(
      (candidate) =>
        candidate.trackId === TOP_TRACK &&
        candidate.start > clip.start + clip.duration,
    )
    if (!neighbour) throw new Error("Expected a neighbour clip for snap coverage")
    const wantedEnd = neighbour.start - 4 / PX_PER_SECOND
    const deltaPx = (wantedEnd - (clip.start + clip.duration)) * PX_PER_SECOND
    await app.getByTestId(`clip-${clip.id}-trim-end`).dragBy(deltaPx, 0, { steps: 6 })
    const trimmed = await selectionOf(app)
    assert.ok(trimmed)
    assertClose(
      trimmed.start + trimmed.duration,
      neighbour.start,
      0.02,
      "snapped trim edge",
    )
  } finally {
    await close(root, app)
  }
}

async function finishesOutsideDrag(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const clip = pickClip(TOP_TRACK)
    await app.getByTestId(`clip-${clip.id}`).dragTo(
      { x: WIDTH + 600, y: HEIGHT + 400 },
      { steps: 4 },
    )
    assert.equal(
      await app.getByTestId("events").textContent(),
      `dragstart:move:${clip.id} dragend:move`,
    )
    const moved = await selectionOf(app)
    assert.ok(moved)
    assert.ok(
      moved.start + moved.duration <= project.durationSeconds + 0.001,
      "dragged clip must remain inside project duration",
    )
  } finally {
    await close(root, app)
  }
}

async function scrubsPlayhead(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    await app.mouse.drag(
      RULER_POINT,
      { x: RULER_POINT.x + 240, y: RULER_POINT.y },
      { steps: 5 },
    )
    const state = await readout(app)
    assertClose(Number(state.head), 640 / PX_PER_SECOND, 0.11, "scrub playhead")
    assert.equal(await app.getByTestId("events").textContent(), "dragstart:scrub dragend:scrub")
  } finally {
    await close(root, app)
  }
}

async function clampsPlayhead(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const pastTheEnd = HEADER_WIDTH + project.durationSeconds * PX_PER_SECOND + 500
    await app.mouse.drag(
      RULER_POINT,
      { x: pastTheEnd, y: RULER_POINT.y },
      { steps: 3 },
    )
    assert.equal(Number((await readout(app)).head), project.durationSeconds)

    await app.mouse.drag(
      RULER_POINT,
      { x: -4000, y: RULER_POINT.y },
      { steps: 3 },
    )
    assert.equal(Number((await readout(app)).head), 0)
  } finally {
    await close(root, app)
  }
}

async function zoomsUnderPointer(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const pointer = { x: HEADER_WIDTH + 600, y: GRID_CENTER.y }
    const before = await readout(app)
    const beforeX = Number(before.x)
    const beforePps = Number(before.pps)
    const timeUnderPointer = (pointer.x - HEADER_WIDTH + beforeX) / beforePps

    await app.mouse.wheel(pointer, 0, 120, { modifiers: "cmd" })

    const after = await readout(app)
    const afterPps = Number(after.pps)
    assert.ok(afterPps > beforePps, `expected zoom in, got ${beforePps} -> ${afterPps}`)
    const timeAfter = (pointer.x - HEADER_WIDTH + Number(after.x)) / afterPps
    assertClose(timeAfter, timeUnderPointer, 0.11, "zoom pointer anchor")
  } finally {
    await close(root, app)
  }
}

async function marqueeSelects(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const empty = emptyPointOn(TOP_TRACK)
    await app.mouse.drag(
      empty,
      { x: empty.x + 260, y: empty.y + 60 },
      { steps: 6 },
    )
    assert.equal(
      await app.getByTestId("events").textContent(),
      "dragstart:marquee dragend:marquee",
    )
    assert.ok(await selectionOf(app), "marquee should select at least one clip")
  } finally {
    await close(root, app)
  }
}

async function togglesCulling(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const before = await readout(app)
    const [shownText, totalText] = (before.clips ?? "").split("/")
    const shown = Number(shownText)
    const total = Number(totalText)
    assert.equal(total, project.clips.length)
    assert.ok(shown < total, `expected culling to hide clips, got ${shown}/${total}`)

    await app.getByTestId("cull-toggle").click()
    assert.equal((await readout(app)).clips, `${total}/${total}`)
  } finally {
    await close(root, app)
  }
}

async function collapsesTrack(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    const before = await readout(app)
    const rowBefore = await app.getByTestId(`track-header-${TOP_TRACK}`).bounds()
    const belowBefore = await app.getByTestId(`track-header-${SECOND_TRACK}`).bounds()

    await app.getByTestId(`track-header-${TOP_TRACK}`).click()

    const after = await readout(app)
    const rowAfter = await app.getByTestId(`track-header-${TOP_TRACK}`).bounds()
    const belowAfter = await app.getByTestId(`track-header-${SECOND_TRACK}`).bounds()
    const shownBefore = Number((before.clips ?? "0/0").split("/")[0])
    const shownAfter = Number((after.clips ?? "0/0").split("/")[0])
    assert.ok(shownAfter < shownBefore)
    assert.ok(rowAfter.height < rowBefore.height)
    assert.ok(belowAfter.y < belowBefore.y)
  } finally {
    await close(root, app)
  }
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("timeline parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const cases: Array<[string, () => Promise<void>]> = [
    ["paint", paintsTimeline],
    ["pan", pansBothAxes],
    ["frozen panes", keepsFrozenPanesAligned],
    ["pan clamp", clampsPan],
    ["native media scroll", scrollsMediaBinNatively],
    ["move", movesClipInTime],
    ["cross-track move", movesClipAcrossTracks],
    ["horizontal move", keepsHorizontalDragOnTrack],
    ["window measurement", measuresGrantedWindow],
    ["trim start", trimsStart],
    ["trim end", trimsEnd],
    ["snap", snapsTrimEdge],
    ["pointer capture", finishesOutsideDrag],
    ["scrub", scrubsPlayhead],
    ["playhead clamp", clampsPlayhead],
    ["zoom", zoomsUnderPointer],
    ["marquee", marqueeSelects],
    ["culling", togglesCulling],
    ["collapse", collapsesTrack],
  ]

  for (const [name, test] of cases) {
    await test()
    console.log(`timeline parity: ${name} passed`)
  }
  console.log("timeline parity: passed")
}

await main()
