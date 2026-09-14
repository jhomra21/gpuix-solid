/**
 * A video-editor timeline, rendered directly on the GPU.
 *
 * It exists to answer one question: can GPUIX carry a real editing surface?
 * So it drags clips between tracks, trims both edges with snapping, scrubs a
 * playhead, marquee-selects, zooms under the pointer, and pans on both axes,
 * with a frozen ruler and a frozen track column.
 *
 * Run on desktop: cd examples && bun --hot timeline.tsx
 * Slow CPU:       THROTTLE=utility bun --hot timeline.tsx
 *
 * ── Why React owns the scroll offset ────────────────────────────────────────
 *
 * The ruler, the track column and the clip grid must move together, to the
 * pixel. A native `overflow: "scroll"` grid cannot do that: GPUI moves the grid
 * on the wheel frame, and the JS callback that would move the other two panes
 * arrives a frame later, so the ruler tears away from the clips during a fast
 * pan. Instead one `onScroll` listener collects wheel deltas, `scrollX` and
 * `scrollY` live in React, and all three panes translate their content from the
 * same numbers. Zed does the same: the editor owns its scroll position and
 * paints the gutter and the text from it.
 *
 * The `<media-bin>` panel beside the preview is a plain two-axis
 * `overflow: "scroll"` container, so the native path stays covered too.
 *
 * ── Why a drag needs no overlay ─────────────────────────────────────────────
 *
 * A node that listens for `onMouseDown` and `onMouseMove` captures the pointer,
 * so move and up keep arriving after the pointer leaves the clip, leaves the
 * timeline, and leaves the window. That is HTML `setPointerCapture`. A
 * full-window overlay mounted on press cannot do the same job: capture is armed
 * by the press itself, and the overlay does not exist yet when that happens, so
 * a release outside the window is lost.
 *
 * Only the pressed element receives moves while the gesture runs, and only the
 * hovered element receives them otherwise, so the cost is one event per pointer
 * move, exactly like a DOM `mousemove` listener.
 *
 * ── Why the translating wrappers set pointerEvents: "none" ──────────────────
 *
 * Each pane holds one absolutely positioned child that carries the scroll
 * offset. An absolutely positioned box takes hits in HTML too, even with no
 * background, so without `pointerEvents: "none"` that wrapper would swallow
 * every press meant for the ruler or the empty grid behind it.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  applyMacCpuThrottleFromEnv,
  render,
  useWindowSize,
  type EventPayload,
  type StyleDesc,
} from '@gpuix/react'
import {
  createProject,
  formatTimecode,
  MIN_CLIP_DURATION,
  tickStep,
  WAVEFORM_HZ,
  type Clip,
  type ClipKind,
  type Project,
  type Track,
} from './timeline-data'

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  app: '#101014',
  panel: '#17171C',
  chrome: '#1C1C22',
  grid: '#121216',
  rowEven: '#16161B',
  rowOdd: '#131317',
  border: '#2A2A32',
  borderSoft: '#22222A',
  text: '#E4E4EA',
  muted: '#9A9AA6',
  faint: '#6C6C78',
  accent: '#4C8DFF',
  playhead: '#4C8DFF',
  snap: '#F5C451',
  marquee: '#4C8DFF33',
  selection: '#FFFFFF',
}

const CLIP_COLORS: Record<ClipKind, { fill: string; hover: string; text: string }> = {
  video: { fill: '#38455C', hover: '#43516B', text: '#DCE4F2' },
  text: { fill: '#3A4356', hover: '#454F66', text: '#DCE4F2' },
  shape: { fill: '#8E4038', hover: '#A04A41', text: '#F6DEDB' },
  audio: { fill: '#1E6B52', hover: '#237B5E', text: '#D6F2E7' },
  caption: { fill: '#8E3670', hover: '#A03F7F', text: '#F7DCEE' },
}

// ── Metrics ──────────────────────────────────────────────────────────────────

const HEADER_WIDTH = 220
const RULER_HEIGHT = 30
const FOOTER_HEIGHT = 34
const ROW_HEIGHT = 34
const CAPTION_ROW_HEIGHT = 30
const AUDIO_ROW_HEIGHT = 56
const COLLAPSED_ROW_HEIGHT = 18
const CLIP_INSET = 3
const TRIM_HANDLE_WIDTH = 7
const SNAP_PX = 6
const MIN_PX_PER_SECOND = 2
const MAX_PX_PER_SECOND = 400
const ZOOM_SLIDER_WIDTH = 120
const DRAG_THRESHOLD_PX = 3

function rowHeight(track: Track): number {
  if (track.kind === 'audio') return AUDIO_ROW_HEIGHT
  if (track.kind === 'caption') return CAPTION_ROW_HEIGHT
  return ROW_HEIGHT
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

// ── Viewport and gestures ────────────────────────────────────────────────────

interface Viewport {
  scrollX: number
  scrollY: number
  pxPerSecond: number
}

type DragKind = 'move' | 'trim-start' | 'trim-end' | 'scrub' | 'marquee' | 'zoom'

/**
 * One gesture. `clip` and the viewport fields are the **snapshot at press
 * time**: every move recomputes geometry from that snapshot plus the total
 * pointer delta, so a long drag cannot accumulate rounding drift.
 */
interface DragState {
  kind: DragKind
  originX: number
  originY: number
  x: number
  y: number
  moved: boolean
  clip: Clip | null
  pxPerSecond: number
  scrollX: number
  scrollY: number
}

/**
 * The three listeners every draggable surface installs. `begin` and `move` on
 * the same node is what arms GPUI's pointer capture, so `move` and `end` keep
 * arriving after the pointer leaves that node, and after it leaves the window.
 */
interface GestureHandlers {
  begin: (kind: DragKind, clip: Clip | null, event: EventPayload) => void
  move: (event: EventPayload) => void
  end: () => void
}

// ── Layout geometry ──────────────────────────────────────────────────────────

interface Geometry {
  gridLeft: number
  gridTop: number
  gridWidth: number
  gridHeight: number
  contentWidth: number
  contentHeight: number
  rowTops: Map<string, number>
  rows: Array<{ track: Track; top: number; height: number }>
}

function buildGeometry(args: {
  project: Project
  pxPerSecond: number
  viewportWidth: number
  bodyHeight: number
  /** Collapsed tracks shrink to a header strip and hold no clips. */
  collapsed: ReadonlySet<string>
}): Geometry {
  const rows: Geometry['rows'] = []
  const rowTops = new Map<string, number>()
  let top = 0
  for (const track of args.project.tracks) {
    const height = args.collapsed.has(track.id)
      ? COLLAPSED_ROW_HEIGHT
      : rowHeight(track)
    rows.push({ track, top, height })
    rowTops.set(track.id, top)
    top += height
  }
  return {
    gridLeft: HEADER_WIDTH,
    // The panel is pinned to the bottom of the window, so the grid origin is
    // exact arithmetic. Nothing has to be measured to convert a window
    // coordinate into a time.
    gridTop: 0,
    gridWidth: Math.max(0, args.viewportWidth - HEADER_WIDTH),
    gridHeight: args.bodyHeight,
    contentWidth: args.project.durationSeconds * args.pxPerSecond,
    contentHeight: top,
    rowTops,
    rows,
  }
}

/** Which track row contains a content-space y. */
function trackAtContentY(geometry: Geometry, y: number): Track {
  for (const row of geometry.rows) {
    if (y >= row.top && y < row.top + row.height) return row.track
  }
  return y < 0 ? geometry.rows[0].track : geometry.rows[geometry.rows.length - 1].track
}

/** Row height for a track id, falling back to the normal row height. */
function rowHeightOf(geometry: Geometry, trackId: string): number {
  return geometry.rows.find((row) => row.track.id === trackId)?.height ?? ROW_HEIGHT
}

// ── Snapping ─────────────────────────────────────────────────────────────────

interface SnapResult {
  seconds: number
  guide: number | null
}

/**
 * Pull `seconds` onto the nearest interesting edge within SNAP_PX. Candidates
 * are the edges of the other clips on the destination track, the playhead, and
 * both ends of the project. Returns the guide time so the drag can paint it.
 */
function snapTime(args: {
  seconds: number
  candidates: number[]
  pxPerSecond: number
}): SnapResult {
  let best: number | null = null
  let bestDistance = SNAP_PX
  for (const candidate of args.candidates) {
    const distance = Math.abs(candidate - args.seconds) * args.pxPerSecond
    if (distance <= bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best === null
    ? { seconds: args.seconds, guide: null }
    : { seconds: best, guide: best }
}

function snapCandidates(args: {
  project: Project
  trackId: string
  ignoreClipId: string
  playhead: number
}): number[] {
  const edges = [0, args.project.durationSeconds, args.playhead]
  for (const clip of args.project.clips) {
    if (clip.trackId !== args.trackId || clip.id === args.ignoreClipId) continue
    edges.push(clip.start, clip.start + clip.duration)
  }
  return edges
}

/**
 * The clip as the drag currently shows it. Pure: same drag state and same
 * project always produce the same rectangle, which is what makes the
 * gesture testable without screenshots.
 */
function previewClip(args: {
  drag: DragState
  project: Project
  geometry: Geometry
  playhead: number
}): { clip: Clip; guide: number | null } | null {
  const { drag, project, geometry } = args
  if (!drag.clip) return null
  const deltaSeconds = (drag.x - drag.originX) / drag.pxPerSecond
  const source = drag.clip

  if (drag.kind === 'move') {
    // Purely a delta from the source row, never an absolute window position.
    // Travelling one row height moves exactly one row, whatever the window
    // geometry says, so a stale viewport size cannot teleport the clip.
    const sourceTop = geometry.rowTops.get(source.trackId) ?? 0
    const sourceCenter = sourceTop + rowHeightOf(geometry, source.trackId) / 2
    const track = trackAtContentY(geometry, sourceCenter + (drag.y - drag.originY))
    // A clip never leaves the project. Without the upper bound a fast drag
    // parks it past the last frame, where nothing can reach it again.
    const maxStart = Math.max(0, project.durationSeconds - source.duration)
    const wanted = clamp(source.start + deltaSeconds, 0, maxStart)
    const candidates = snapCandidates({
      project,
      trackId: track.id,
      ignoreClipId: source.id,
      playhead: args.playhead,
    })
    // Snap whichever edge is closer, then move the whole clip by that amount.
    const startSnap = snapTime({ seconds: wanted, candidates, pxPerSecond: drag.pxPerSecond })
    const endSnap = snapTime({
      seconds: wanted + source.duration,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
    const useStart =
      startSnap.guide !== null &&
      (endSnap.guide === null ||
        Math.abs(startSnap.seconds - wanted) <=
          Math.abs(endSnap.seconds - source.duration - wanted))
    const start = useStart
      ? startSnap.seconds
      : endSnap.guide !== null
        ? endSnap.seconds - source.duration
        : wanted
    const clamped = clamp(start, 0, maxStart)
    return {
      clip: { ...source, trackId: track.id, start: clamped },
      // A snap that the clamp overrode is not a snap the user can see.
      guide: clamped === start ? (useStart ? startSnap.guide : endSnap.guide) : null,
    }
  }

  const candidates = snapCandidates({
    project,
    trackId: source.trackId,
    ignoreClipId: source.id,
    playhead: args.playhead,
  })

  if (drag.kind === 'trim-start') {
    const limit = source.start + source.duration - MIN_CLIP_DURATION
    const snapped = snapTime({
      seconds: source.start + deltaSeconds,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
    const start = clamp(snapped.seconds, 0, limit)
    return {
      clip: { ...source, start, duration: source.start + source.duration - start },
      guide: start === snapped.seconds ? snapped.guide : null,
    }
  }

  if (drag.kind === 'trim-end') {
    const snapped = snapTime({
      seconds: source.start + source.duration + deltaSeconds,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
    const end = clamp(
      snapped.seconds,
      source.start + MIN_CLIP_DURATION,
      project.durationSeconds
    )
    return {
      clip: { ...source, duration: end - source.start },
      guide: end === snapped.seconds ? snapped.guide : null,
    }
  }

  return null
}

/** Clip ids whose painted rectangle overlaps the marquee, in window space. */
function marqueeHits(args: {
  drag: DragState
  geometry: Geometry
  project: Project
}): Set<string> {
  const { drag, geometry, project } = args
  const left = Math.min(drag.originX, drag.x)
  const right = Math.max(drag.originX, drag.x)
  const top = Math.min(drag.originY, drag.y)
  const bottom = Math.max(drag.originY, drag.y)
  const hit = new Set<string>()
  for (const clip of project.clips) {
    const clipLeft = geometry.gridLeft + clip.start * drag.pxPerSecond - drag.scrollX
    const clipRight = clipLeft + clip.duration * drag.pxPerSecond
    const rowTop = geometry.rowTops.get(clip.trackId) ?? 0
    const clipTop = geometry.gridTop + rowTop - drag.scrollY
    const height = rowHeightOf(geometry, clip.trackId)
    if (
      clipRight >= left &&
      clipLeft <= right &&
      clipTop + height >= top &&
      clipTop <= bottom
    ) {
      hit.add(clip.id)
    }
  }
  return hit
}

// ── Small chrome pieces ──────────────────────────────────────────────────────

function Label({
  children,
  size = 11,
  color = C.muted,
  style,
}: {
  children: React.ReactNode
  size?: number
  color?: string
  style?: StyleDesc
}) {
  return (
    <text
      style={{
        fontSize: size,
        color,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </text>
  )
}

// ── Ruler ────────────────────────────────────────────────────────────────────

const RulerTicks = memo(function RulerTicks({
  duration,
  pxPerSecond,
}: {
  duration: number
  pxPerSecond: number
}) {
  const step = tickStep(pxPerSecond)
  const ticks: React.ReactNode[] = []
  for (let seconds = 0; seconds <= duration; seconds += step) {
    const left = seconds * pxPerSecond
    ticks.push(
      <div
        key={`tick-${seconds}`}
        style={{
          position: 'absolute',
          left,
          top: 0,
          width: 1,
          height: RULER_HEIGHT,
          backgroundColor: C.border,
          pointerEvents: 'none',
        }}
      />
    )
    ticks.push(
      <div
        key={`label-${seconds}`}
        style={{ position: 'absolute', left: left + 5, top: 7, pointerEvents: 'none' }}
      >
        <Label size={10} color={C.faint}>
          {String(Math.round(seconds))}
        </Label>
      </div>
    )
  }
  return <>{ticks}</>
})

// ── Track headers ────────────────────────────────────────────────────────────

const TrackHeaders = memo(function TrackHeaders({
  rows,
  collapsed,
  onToggle,
}: {
  rows: Geometry['rows']
  collapsed: ReadonlySet<string>
  onToggle: (trackId: string) => void
}) {
  return (
    <>
      {rows.map(({ track, top, height }) => (
        <div
          key={track.id}
          testId={`track-header-${track.id}`}
          style={{
            position: 'absolute',
            left: 0,
            top,
            width: HEADER_WIDTH,
            height,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 10,
            paddingRight: 10,
            borderBottomWidth: 1,
            borderColor: C.borderSoft,
            backgroundColor: C.chrome,
            cursor: 'pointer',
            userSelect: 'none',
            hover: { backgroundColor: '#212129' },
          }}
          onClick={() => onToggle(track.id)}
        >
          <Label size={10} color={C.faint}>
            {collapsed.has(track.id) ? '▸' : '▾'}
          </Label>
          <Label size={12} color={C.text}>
            {track.name}
          </Label>
        </div>
      ))}
    </>
  )
})

// ── Clips ────────────────────────────────────────────────────────────────────

function Waveform({ project, clip, width }: { project: Project; clip: Clip; width: number }) {
  const bars: React.ReactNode[] = []
  const barWidth = 2
  const gap = 1
  const count = Math.min(240, Math.max(0, Math.floor(width / (barWidth + gap))))
  for (let index = 0; index < count; index += 1) {
    const seconds = clip.start + (index / Math.max(1, count)) * clip.duration
    const sample = project.waveform[Math.floor(seconds * WAVEFORM_HZ)] ?? 0.2
    bars.push(
      <div
        key={index}
        style={{
          width: barWidth,
          height: Math.max(2, sample * 26),
          backgroundColor: '#5FE3B0',
          opacity: 0.75,
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: 6,
        bottom: 4,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap,
        height: 26,
        pointerEvents: 'none',
      }}
    >
      {bars}
    </div>
  )
}

interface ClipViewProps {
  project: Project
  clip: Clip
  top: number
  height: number
  pxPerSecond: number
  selected: boolean
  ghost: boolean
  /** `clip-<id>` normally, `clip-preview` for the in-flight drag copy, so a
   *  locator never matches two elements at once. */
  testId: string
  gesture: GestureHandlers
}

const TRIM_HANDLE_BASE: StyleDesc = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: TRIM_HANDLE_WIDTH,
  cursor: 'col-resize',
  backgroundColor: '#FFFFFF14',
  hover: { backgroundColor: '#FFFFFF3D' },
}

const ClipView = memo(function ClipView({
  project,
  clip,
  top,
  height,
  pxPerSecond,
  selected,
  ghost,
  testId,
  gesture,
}: ClipViewProps) {
  const color = CLIP_COLORS[clip.kind]
  const width = Math.max(2, clip.duration * pxPerSecond)

  return (
    <div
      testId={testId}
      style={{
        position: 'absolute',
        left: clip.start * pxPerSecond,
        top: top + CLIP_INSET,
        width,
        height: height - CLIP_INSET * 2,
        borderRadius: 4,
        backgroundColor: color.fill,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? C.selection : '#00000059',
        opacity: ghost ? 0.35 : 1,
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
        hover: { backgroundColor: color.hover },
        active: { cursor: 'grabbing' },
      }}
      onMouseDown={(event) => gesture.begin('move', clip, event)}
      onMouseMove={gesture.move}
      onMouseUp={gesture.end}
    >
      {clip.kind === 'audio' && width > 24 && (
        <Waveform project={project} clip={clip} width={width} />
      )}
      {width > 22 && (
        <div style={{ paddingLeft: 6, paddingTop: 3, paddingRight: 4 }}>
          <Label size={11} color={color.text}>
            {clip.label}
          </Label>
        </div>
      )}
      {width > TRIM_HANDLE_WIDTH * 3 && (
        <>
          <div
            testId={`${testId}-trim-start`}
            style={{ ...TRIM_HANDLE_BASE, left: 0 }}
            onMouseDown={(event) => gesture.begin('trim-start', clip, event)}
            onMouseMove={gesture.move}
            onMouseUp={gesture.end}
          />
          <div
            testId={`${testId}-trim-end`}
            style={{ ...TRIM_HANDLE_BASE, right: 0 }}
            onMouseDown={(event) => gesture.begin('trim-end', clip, event)}
            onMouseMove={gesture.move}
            onMouseUp={gesture.end}
          />
        </>
      )}
    </div>
  )
})

interface ClipLayerProps {
  project: Project
  clips: Clip[]
  geometry: Geometry
  pxPerSecond: number
  selection: ReadonlySet<string>
  draggingClipId: string | null
  gesture: GestureHandlers
}

/**
 * Rows and clips. `memo` matters: with culling off, a pan changes only the
 * translating wrapper's style, so this whole subtree is skipped and the wheel
 * costs three mutations instead of one per clip.
 */
const ClipLayer = memo(function ClipLayer({
  project,
  clips,
  geometry,
  pxPerSecond,
  selection,
  draggingClipId,
  gesture,
}: ClipLayerProps) {
  return (
    <>
      {geometry.rows.map(({ track, top, height }, index) => (
        <div
          key={track.id}
          style={{
            position: 'absolute',
            left: 0,
            top,
            width: geometry.contentWidth,
            height,
            backgroundColor: index % 2 === 0 ? C.rowEven : C.rowOdd,
            borderBottomWidth: 1,
            borderColor: C.borderSoft,
            // Rows must not take hits, or they would block the marquee that
            // starts on the empty grid behind them.
            pointerEvents: 'none',
          }}
        />
      ))}
      {clips.map((clip) => (
        <ClipView
          key={clip.id}
          project={project}
          clip={clip}
          top={geometry.rowTops.get(clip.trackId) ?? 0}
          height={rowHeightOf(geometry, clip.trackId)}
          pxPerSecond={pxPerSecond}
          selected={selection.has(clip.id)}
          ghost={clip.id === draggingClipId}
          testId={`clip-${clip.id}`}
          gesture={gesture}
        />
      ))}
    </>
  )
})

// ── Media bin: the native two-axis scroll path ───────────────────────────────

const MEDIA_THUMB_WIDTH = 96
const MEDIA_THUMB_GAP = 6
const MEDIA_COLUMNS = 8
const MEDIA_ROW_WIDTH =
  MEDIA_COLUMNS * MEDIA_THUMB_WIDTH + (MEDIA_COLUMNS - 1) * MEDIA_THUMB_GAP

const MediaBin = memo(function MediaBin() {
  const cells: React.ReactNode[] = []
  for (let row = 0; row < 12; row += 1) {
    const items: React.ReactNode[] = []
    for (let column = 0; column < MEDIA_COLUMNS; column += 1) {
      items.push(
        <div
          key={column}
          style={{
            width: MEDIA_THUMB_WIDTH,
            height: 54,
            flexShrink: 0,
            borderRadius: 4,
            backgroundColor: column % 2 === row % 2 ? '#242430' : '#2C2C3A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label size={10} color={C.faint}>{`${row}-${column}`}</Label>
        </div>
      )
    }
    cells.push(
      <div
        key={row}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: MEDIA_THUMB_GAP,
          // A flex column stretches its children to the cross axis, so without
          // an explicit width every row would be as narrow as the viewport and
          // there would be nothing to pan on X.
          width: MEDIA_ROW_WIDTH,
          flexShrink: 0,
        }}
      >
        {items}
      </div>
    )
  }
  return (
    <div
      testId="media-bin"
      style={{
        width: 260,
        height: 220,
        overflow: 'scroll',
        display: 'flex',
        flexDirection: 'column',
        gap: MEDIA_THUMB_GAP,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.panel,
      }}
    >
      {cells}
    </div>
  )
})

// ── App ──────────────────────────────────────────────────────────────────────

export interface TimelineAppProps {
  trackCount?: number
  durationSeconds?: number
  /** Explicit size keeps tests independent of the live window. */
  viewportWidth?: number
  viewportHeight?: number
  /** Render every clip instead of only the visible window. */
  cull?: boolean
}

export function TimelineApp(props: TimelineAppProps = {}) {
  const windowSize = useWindowSize()
  const viewportWidth = props.viewportWidth ?? windowSize.width
  const viewportHeight = props.viewportHeight ?? windowSize.height

  const [project, setProject] = useState<Project>(() =>
    createProject({
      trackCount: props.trackCount,
      durationSeconds: props.durationSeconds,
    })
  )
  const [viewport, setViewport] = useState<Viewport>({
    scrollX: 0,
    scrollY: 0,
    pxPerSecond: 24,
  })
  const [playhead, setPlayhead] = useState(3.5)
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set<string>())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>())
  const [drag, setDrag] = useState<DragState | null>(null)
  const [cull, setCull] = useState(props.cull ?? true)
  const [log, setLog] = useState<string[]>([])

  const bodyHeight = useMemo(() => {
    const rowsHeight = project.tracks.reduce((total, track) => total + rowHeight(track), 0)
    return Math.max(120, Math.min(rowsHeight, Math.round(viewportHeight * 0.42)))
  }, [project.tracks, viewportHeight])

  const geometryBase = useMemo(
    () =>
      buildGeometry({
        project,
        pxPerSecond: viewport.pxPerSecond,
        viewportWidth,
        bodyHeight,
        collapsed,
      }),
    [project, viewport.pxPerSecond, viewportWidth, bodyHeight, collapsed]
  )

  const panelHeight = RULER_HEIGHT + bodyHeight + FOOTER_HEIGHT
  const geometry = useMemo<Geometry>(
    () => ({ ...geometryBase, gridTop: viewportHeight - panelHeight + RULER_HEIGHT }),
    [geometryBase, viewportHeight, panelHeight]
  )

  const maxScrollX = Math.max(0, geometry.contentWidth - geometry.gridWidth)
  const maxScrollY = Math.max(0, geometry.contentHeight - geometry.gridHeight)

  // Handlers must stay referentially stable so `memo(ClipLayer)` can skip a
  // pan. They read the live values from refs instead of closing over state.
  const live = useRef({ viewport, geometry, project, playhead, maxScrollX, maxScrollY })
  live.current = { viewport, geometry, project, playhead, maxScrollX, maxScrollY }

  // `dragRef` is the owner; `drag` is the copy React paints from. Keeping the
  // owner in a ref means a handler never has to run a side effect inside a
  // state updater to read the gesture it is finishing.
  const dragRef = useRef<DragState | null>(null)
  const zoomOriginRef = useRef<{ left: number } | null>(null)

  const updateDrag = useCallback((next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  const note = useCallback((entry: string) => {
    setLog((entries) => [...entries, entry].slice(-8))
  }, [])

  const preview = useMemo(
    () => (drag ? previewClip({ drag, project, geometry, playhead }) : null),
    [drag, project, geometry, playhead]
  )

  // ── Wheel: pan on both axes, or zoom under the pointer ─────────────────────
  const onWheel = useCallback((event: EventPayload) => {
    const deltaX = event.deltaX ?? 0
    const deltaY = event.deltaY ?? 0
    const zoom = event.modifiers?.cmd || event.modifiers?.ctrl
    const state = live.current

    if (zoom) {
      const pointerX = event.x ?? state.geometry.gridLeft
      const timeUnderPointer =
        (pointerX - state.geometry.gridLeft + state.viewport.scrollX) /
        state.viewport.pxPerSecond
      const pxPerSecond = clamp(
        state.viewport.pxPerSecond * Math.exp(deltaY * 0.005),
        MIN_PX_PER_SECOND,
        MAX_PX_PER_SECOND
      )
      const contentWidth = state.project.durationSeconds * pxPerSecond
      const scrollX = clamp(
        timeUnderPointer * pxPerSecond - (pointerX - state.geometry.gridLeft),
        0,
        Math.max(0, contentWidth - state.geometry.gridWidth)
      )
      setViewport((current) => ({ ...current, pxPerSecond, scrollX }))
      return
    }

    // shift swaps the axis, like every other editor.
    const panX = event.modifiers?.shift ? -deltaY : -deltaX
    const panY = event.modifiers?.shift ? 0 : -deltaY
    setViewport((current) => ({
      ...current,
      scrollX: clamp(current.scrollX + panX, 0, state.maxScrollX),
      scrollY: clamp(current.scrollY + panY, 0, state.maxScrollY),
    }))
  }, [])

  // ── Gesture start ─────────────────────────────────────────────────────────
  const beginDrag = useCallback(
    (kind: DragKind, clip: Clip | null, event: EventPayload) => {
      const state = live.current
      updateDrag({
        kind,
        originX: event.x ?? 0,
        originY: event.y ?? 0,
        x: event.x ?? 0,
        y: event.y ?? 0,
        moved: false,
        clip,
        pxPerSecond: state.viewport.pxPerSecond,
        scrollX: state.viewport.scrollX,
        scrollY: state.viewport.scrollY,
      })
      note(`dragstart:${kind}${clip ? `:${clip.id}` : ''}`)
    },
    [note, updateDrag]
  )

  const beginClipDrag = useCallback(
    (kind: DragKind, clip: Clip | null, event: EventPayload) => {
      if (clip) {
        const additive = event.modifiers?.shift || event.modifiers?.cmd
        setSelection((current) => {
          if (!additive) return new Set([clip.id])
          const next = new Set(current)
          if (next.has(clip.id)) next.delete(clip.id)
          else next.add(clip.id)
          return next
        })
      }
      beginDrag(kind, clip, event)
    },
    [beginDrag]
  )

  /** Window x to a project time, clamped inside the project. */
  const secondsAtWindowX = useCallback((x: number) => {
    const state = live.current
    return clamp(
      (x - state.geometry.gridLeft + state.viewport.scrollX) / state.viewport.pxPerSecond,
      0,
      state.project.durationSeconds
    )
  }, [])

  const onRulerMouseDown = useCallback(
    (event: EventPayload) => {
      setPlayhead(secondsAtWindowX(event.x ?? 0))
      beginDrag('scrub', null, event)
    },
    [beginDrag, secondsAtWindowX]
  )

  const onGridMouseDown = useCallback(
    (event: EventPayload) => {
      if (!event.modifiers?.shift && !event.modifiers?.cmd) setSelection(new Set())
      beginDrag('marquee', null, event)
    },
    [beginDrag]
  )

  // ── Gesture move and end, on the single overlay ───────────────────────────
  const onGestureMove = useCallback(
    (event: EventPayload) => {
      const current = dragRef.current
      if (!current) return
      const x = event.x ?? 0
      const y = event.y ?? 0
      updateDrag({
        ...current,
        x,
        y,
        moved:
          current.moved ||
          Math.abs(x - current.originX) > DRAG_THRESHOLD_PX ||
          Math.abs(y - current.originY) > DRAG_THRESHOLD_PX,
      })

      if (current.kind === 'scrub') {
        setPlayhead(secondsAtWindowX(x))
        return
      }
      if (current.kind === 'zoom' && zoomOriginRef.current) {
        const state = live.current
        const ratio = clamp(
          (x - zoomOriginRef.current.left) / ZOOM_SLIDER_WIDTH,
          0,
          1
        )
        const pxPerSecond =
          MIN_PX_PER_SECOND * Math.pow(MAX_PX_PER_SECOND / MIN_PX_PER_SECOND, ratio)
        const contentWidth = state.project.durationSeconds * pxPerSecond
        setViewport((viewportState) => ({
          ...viewportState,
          pxPerSecond,
          scrollX: clamp(
            viewportState.scrollX,
            0,
            Math.max(0, contentWidth - state.geometry.gridWidth)
          ),
        }))
      }
    },
    [secondsAtWindowX, updateDrag]
  )

  const commitDrag = useCallback(() => {
    const current = dragRef.current
    if (!current) return
    updateDrag(null)
    zoomOriginRef.current = null

    const state = live.current
    if (current.moved) {
      const result = previewClip({
        drag: current,
        project: state.project,
        geometry: state.geometry,
        playhead: state.playhead,
      })
      if (result) {
        const next = result.clip
        setProject((old) => ({
          ...old,
          clips: old.clips.map((clip) => (clip.id === next.id ? next : clip)),
        }))
      }
      if (current.kind === 'marquee') {
        setSelection(
          marqueeHits({
            drag: current,
            geometry: state.geometry,
            project: state.project,
          })
        )
      }
    }
    note(`dragend:${current.kind}`)
  }, [note, updateDrag])

  const clipGesture = useMemo<GestureHandlers>(
    () => ({ begin: beginClipDrag, move: onGestureMove, end: commitDrag }),
    [beginClipDrag, onGestureMove, commitDrag]
  )
  const chromeGesture = useMemo<GestureHandlers>(
    () => ({ begin: beginDrag, move: onGestureMove, end: commitDrag }),
    [beginDrag, onGestureMove, commitDrag]
  )

  const onToggleTrack = useCallback((trackId: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }, [])

  // ── Derived clip list ─────────────────────────────────────────────────────
  const visibleClips = useMemo(() => {
    const shown =
      collapsed.size === 0
        ? project.clips
        : project.clips.filter((clip) => !collapsed.has(clip.trackId))
    if (!cull) return shown
    const startSeconds = viewport.scrollX / viewport.pxPerSecond
    const endSeconds = (viewport.scrollX + geometry.gridWidth) / viewport.pxPerSecond
    const topPx = viewport.scrollY
    const bottomPx = viewport.scrollY + geometry.gridHeight
    return shown.filter((clip) => {
      if (clip.start > endSeconds || clip.start + clip.duration < startSeconds) return false
      const top = geometry.rowTops.get(clip.trackId) ?? 0
      const height = rowHeightOf(geometry, clip.trackId)
      return top <= bottomPx && top + height >= topPx
    })
  }, [project.clips, collapsed, cull, viewport, geometry])

  const selectedClip = useMemo(() => {
    const [first] = [...selection]
    return first ? (project.clips.find((clip) => clip.id === first) ?? null) : null
  }, [selection, project.clips])

  const readout = [
    `x=${Math.round(viewport.scrollX)}`,
    `y=${Math.round(viewport.scrollY)}`,
    `pps=${viewport.pxPerSecond.toFixed(2)}`,
    `head=${playhead.toFixed(2)}`,
    `clips=${visibleClips.length}/${project.clips.length}`,
  ].join(' ')

  const selectionReadout = selectedClip
    ? `${selectedClip.id} ${selectedClip.trackId} ${selectedClip.start.toFixed(
        2
      )} ${selectedClip.duration.toFixed(2)}`
    : 'none'

  const zoomRatio =
    Math.log(viewport.pxPerSecond / MIN_PX_PER_SECOND) /
    Math.log(MAX_PX_PER_SECOND / MIN_PX_PER_SECOND)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: C.app,
      }}
    >
      {/* Preview area. Not the point of the example, but the timeline needs
          something above it to prove the panel keeps its own height. */}
      <div
        style={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 20,
        }}
      >
        <MediaBin />
        <div
          style={{
            flexGrow: 1,
            minWidth: 0,
            height: '100%',
            borderRadius: 10,
            backgroundColor: '#0B0B0E',
            borderWidth: 1,
            borderColor: C.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label size={13} color={C.faint}>
            {formatTimecode(playhead)}
          </Label>
        </div>
      </div>

      {/* Timeline panel. One onScroll listener pans every pane. */}
      <div
        testId="timeline-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: panelHeight,
          flexShrink: 0,
          borderTopWidth: 1,
          borderColor: C.border,
          backgroundColor: C.panel,
        }}
        onScroll={onWheel}
      >
        {/* Ruler row */}
        <div style={{ display: 'flex', flexDirection: 'row', height: RULER_HEIGHT }}>
          <div
            style={{
              width: HEADER_WIDTH,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 10,
              paddingRight: 10,
              backgroundColor: C.chrome,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: C.border,
            }}
          >
            <Label size={11}>Timeline</Label>
            <Label size={11} color={C.text}>
              {formatTimecode(playhead)}
            </Label>
          </div>
          <div
            testId="timeline-ruler"
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: RULER_HEIGHT,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: C.chrome,
              borderBottomWidth: 1,
              borderColor: C.border,
              cursor: 'col-resize',
            }}
            onMouseDown={onRulerMouseDown}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: 'absolute',
                left: -viewport.scrollX,
                top: 0,
                width: geometry.contentWidth,
                height: RULER_HEIGHT,
                pointerEvents: 'none',
              }}
            >
              <RulerTicks
                duration={project.durationSeconds}
                pxPerSecond={viewport.pxPerSecond}
              />
              <div
                testId="timeline-playhead"
                style={{
                  position: 'absolute',
                  left: playhead * viewport.pxPerSecond - 4,
                  top: 4,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: C.playhead,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Body row */}
        <div style={{ display: 'flex', flexDirection: 'row', height: bodyHeight }}>
          <div
            style={{
              width: HEADER_WIDTH,
              flexShrink: 0,
              height: bodyHeight,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: C.chrome,
              borderRightWidth: 1,
              borderColor: C.border,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: -viewport.scrollY,
                width: HEADER_WIDTH,
                height: geometry.contentHeight,
                pointerEvents: 'none',
              }}
            >
              <TrackHeaders
                rows={geometry.rows}
                collapsed={collapsed}
                onToggle={onToggleTrack}
              />
            </div>
          </div>

          <div
            testId="timeline-grid"
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: bodyHeight,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: C.grid,
            }}
            onMouseDown={onGridMouseDown}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: 'absolute',
                left: -viewport.scrollX,
                top: -viewport.scrollY,
                width: geometry.contentWidth,
                height: geometry.contentHeight,
                pointerEvents: 'none',
              }}
            >
              <ClipLayer
                project={project}
                clips={visibleClips}
                geometry={geometry}
                pxPerSecond={viewport.pxPerSecond}
                selection={selection}
                draggingClipId={preview ? preview.clip.id : null}
                gesture={clipGesture}
              />
              {preview && (
                <ClipView
                  project={project}
                  clip={preview.clip}
                  top={geometry.rowTops.get(preview.clip.trackId) ?? 0}
                  height={rowHeightOf(geometry, preview.clip.trackId)}
                  pxPerSecond={viewport.pxPerSecond}
                  selected
                  ghost={false}
                  testId="clip-preview"
                  gesture={clipGesture}
                />
              )}
              {preview?.guide != null && (
                <div
                  testId="snap-guide"
                  style={{
                    position: 'absolute',
                    left: preview.guide * viewport.pxPerSecond,
                    top: 0,
                    width: 1,
                    height: geometry.contentHeight,
                    backgroundColor: C.snap,
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  left: playhead * viewport.pxPerSecond,
                  top: 0,
                  width: 2,
                  height: geometry.contentHeight,
                  backgroundColor: C.playhead,
                  pointerEvents: 'none',
                }}
              />
            </div>
            {drag?.kind === 'marquee' && drag.moved && (
              <div
                testId="marquee"
                style={{
                  position: 'absolute',
                  left: Math.min(drag.originX, drag.x) - geometry.gridLeft,
                  top: Math.min(drag.originY, drag.y) - geometry.gridTop,
                  width: Math.abs(drag.x - drag.originX),
                  height: Math.abs(drag.y - drag.originY),
                  backgroundColor: C.marquee,
                  borderWidth: 1,
                  borderColor: C.accent,
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            height: FOOTER_HEIGHT,
            paddingLeft: 10,
            paddingRight: 10,
            borderTopWidth: 1,
            borderColor: C.border,
            backgroundColor: C.chrome,
          }}
        >
          <Label size={11} color={C.text}>
            {project.name}
          </Label>
          <div
            testId="zoom-slider"
            style={{
              position: 'relative',
              width: ZOOM_SLIDER_WIDTH,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.border,
              cursor: 'ew-resize',
            }}
            onMouseDown={(event) => {
              zoomOriginRef.current = {
                left: (event.x ?? 0) - zoomRatio * ZOOM_SLIDER_WIDTH,
              }
              chromeGesture.begin('zoom', null, event)
            }}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: 'absolute',
                left: zoomRatio * ZOOM_SLIDER_WIDTH - 5,
                top: -3,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: C.accent,
                pointerEvents: 'none',
              }}
            />
          </div>
          <div
            testId="cull-toggle"
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 4,
              backgroundColor: cull ? '#26364F' : '#242430',
              cursor: 'pointer',
              hover: { backgroundColor: '#2E4160' },
            }}
            onClick={() => setCull((value) => !value)}
          >
            <Label size={10} color={cull ? C.accent : C.faint}>
              {cull ? 'cull on' : 'cull off'}
            </Label>
          </div>
          <text testId="readout" style={{ fontSize: 10, color: C.faint, userSelect: 'none' }}>
            {readout}
          </text>
          <text
            testId="selection"
            style={{ fontSize: 10, color: C.faint, userSelect: 'none' }}
          >
            {selectionReadout}
          </text>
          <text testId="events" style={{ fontSize: 10, color: C.faint, userSelect: 'none' }}>
            {log.join(' ')}
          </text>
        </div>
      </div>
    </div>
  )
}

const isEntryPoint =
  typeof Bun !== 'undefined'
    ? Bun.isStandaloneExecutable || Bun.main === import.meta.path
    : typeof process !== 'undefined' && process.argv[1]?.endsWith('timeline.tsx')

if (isEntryPoint) {
  applyMacCpuThrottleFromEnv()
  render(<TimelineApp />, {
    title: 'GPUIX · Timeline',
    width: 1280,
    height: 800,
    debugFrameOverlay: 'full',
    // Agent checks need real GPU paint, not control of the user's keyboard.
    focus: process.env.GPUIX_BACKGROUND !== '1',
  })
}
