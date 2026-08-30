/**
 * Solid 2 port of the published GPUIX 0.6 video-editor timeline example.
 *
 * The timeline owns its pan so the ruler, frozen track column, and clip grid
 * move from one reactive viewport. The media bin separately covers native
 * two-axis overflow scrolling. Pointer-captured gestures cover move, trim,
 * scrub, marquee selection, and zoom.
 */

import {
  For,
  Show,
  createMemo,
  createSignal,
  type Element as SolidElement,
} from "solid-js"
import {
  useWindowSize,
  type EventPayload,
} from "gpuix-solid"
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
} from "./data"

const C = {
  app: "#101014",
  panel: "#17171C",
  chrome: "#1C1C22",
  grid: "#121216",
  rowEven: "#16161B",
  rowOdd: "#131317",
  border: "#2A2A32",
  borderSoft: "#22222A",
  text: "#E4E4EA",
  muted: "#9A9AA6",
  faint: "#6C6C78",
  accent: "#4C8DFF",
  playhead: "#4C8DFF",
  snap: "#F5C451",
  marquee: "#4C8DFF33",
  selection: "#FFFFFF",
} as const

const CLIP_COLORS: Record<ClipKind, { fill: string; hover: string; text: string }> = {
  video: { fill: "#38455C", hover: "#43516B", text: "#DCE4F2" },
  text: { fill: "#3A4356", hover: "#454F66", text: "#DCE4F2" },
  shape: { fill: "#8E4038", hover: "#A04A41", text: "#F6DEDB" },
  audio: { fill: "#1E6B52", hover: "#237B5E", text: "#D6F2E7" },
  caption: { fill: "#8E3670", hover: "#A03F7F", text: "#F7DCEE" },
}

export const HEADER_WIDTH = 220
export const RULER_HEIGHT = 30
export const FOOTER_HEIGHT = 34
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

export function trackHeight(track: Pick<Track, "kind">): number {
  if (track.kind === "audio") return AUDIO_ROW_HEIGHT
  if (track.kind === "caption") return CAPTION_ROW_HEIGHT
  return ROW_HEIGHT
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

interface Viewport {
  scrollX: number
  scrollY: number
  pxPerSecond: number
}

type DragKind = "move" | "trim-start" | "trim-end" | "scrub" | "marquee" | "zoom"

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

interface GestureHandlers {
  begin: (kind: DragKind, clip: Clip | null, event: EventPayload) => void
  move: (event: EventPayload) => void
  end: () => void
}

interface GeometryRow {
  track: Track
  top: number
  height: number
}

interface Geometry {
  gridLeft: number
  gridTop: number
  gridWidth: number
  gridHeight: number
  contentWidth: number
  contentHeight: number
  rowTops: Map<string, number>
  rows: GeometryRow[]
}

function buildGeometry(args: {
  project: Project
  pxPerSecond: number
  viewportWidth: number
  bodyHeight: number
  collapsed: ReadonlySet<string>
}): Geometry {
  const rows: GeometryRow[] = []
  const rowTops = new Map<string, number>()
  let top = 0
  for (const track of args.project.tracks) {
    const height = args.collapsed.has(track.id)
      ? COLLAPSED_ROW_HEIGHT
      : trackHeight(track)
    rows.push({ track, top, height })
    rowTops.set(track.id, top)
    top += height
  }
  return {
    gridLeft: HEADER_WIDTH,
    gridTop: 0,
    gridWidth: Math.max(0, args.viewportWidth - HEADER_WIDTH),
    gridHeight: args.bodyHeight,
    contentWidth: args.project.durationSeconds * args.pxPerSecond,
    contentHeight: top,
    rowTops,
    rows,
  }
}

function trackAtContentY(geometry: Geometry, y: number): Track {
  for (const row of geometry.rows) {
    if (y >= row.top && y < row.top + row.height) return row.track
  }
  if (geometry.rows.length === 0) {
    throw new Error("Timeline geometry has no tracks")
  }
  return y < 0 ? geometry.rows[0]!.track : geometry.rows[geometry.rows.length - 1]!.track
}

function rowHeightOf(geometry: Geometry, trackId: string): number {
  return geometry.rows.find((row) => row.track.id === trackId)?.height ?? ROW_HEIGHT
}

interface SnapResult {
  seconds: number
  guide: number | null
}

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

function previewClip(args: {
  drag: DragState
  project: Project
  geometry: Geometry
  playhead: number
}): { clip: Clip; guide: number | null } | null {
  const { drag, project, geometry } = args
  if (!drag.clip) return null
  const source = drag.clip
  const deltaSeconds = (drag.x - drag.originX) / drag.pxPerSecond

  if (drag.kind === "move") {
    const sourceTop = geometry.rowTops.get(source.trackId) ?? 0
    const sourceCenter = sourceTop + rowHeightOf(geometry, source.trackId) / 2
    const track = trackAtContentY(geometry, sourceCenter + (drag.y - drag.originY))
    const maxStart = Math.max(0, project.durationSeconds - source.duration)
    const wanted = clamp(source.start + deltaSeconds, 0, maxStart)
    const candidates = snapCandidates({
      project,
      trackId: track.id,
      ignoreClipId: source.id,
      playhead: args.playhead,
    })
    const startSnap = snapTime({
      seconds: wanted,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
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
      guide: clamped === start
        ? useStart
          ? startSnap.guide
          : endSnap.guide
        : null,
    }
  }

  const candidates = snapCandidates({
    project,
    trackId: source.trackId,
    ignoreClipId: source.id,
    playhead: args.playhead,
  })

  if (drag.kind === "trim-start") {
    const limit = source.start + source.duration - MIN_CLIP_DURATION
    const snapped = snapTime({
      seconds: source.start + deltaSeconds,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
    const start = clamp(snapped.seconds, 0, limit)
    return {
      clip: {
        ...source,
        start,
        duration: source.start + source.duration - start,
      },
      guide: start === snapped.seconds ? snapped.guide : null,
    }
  }

  if (drag.kind === "trim-end") {
    const snapped = snapTime({
      seconds: source.start + source.duration + deltaSeconds,
      candidates,
      pxPerSecond: drag.pxPerSecond,
    })
    const end = clamp(
      snapped.seconds,
      source.start + MIN_CLIP_DURATION,
      project.durationSeconds,
    )
    return {
      clip: { ...source, duration: end - source.start },
      guide: end === snapped.seconds ? snapped.guide : null,
    }
  }

  return null
}

function marqueeHits(args: {
  drag: DragState
  geometry: Geometry
  project: Project
}): Set<string> {
  const left = Math.min(args.drag.originX, args.drag.x)
  const right = Math.max(args.drag.originX, args.drag.x)
  const top = Math.min(args.drag.originY, args.drag.y)
  const bottom = Math.max(args.drag.originY, args.drag.y)
  const hit = new Set<string>()

  for (const clip of args.project.clips) {
    const clipLeft =
      args.geometry.gridLeft +
      clip.start * args.drag.pxPerSecond -
      args.drag.scrollX
    const clipRight = clipLeft + clip.duration * args.drag.pxPerSecond
    const rowTop = args.geometry.rowTops.get(clip.trackId) ?? 0
    const clipTop = args.geometry.gridTop + rowTop - args.drag.scrollY
    const height = rowHeightOf(args.geometry, clip.trackId)
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

function Label(props: {
  children: SolidElement
  size?: number
  color?: string
}) {
  return (
    <text
      style={{
        fontSize: props.size ?? 11,
        color: props.color ?? C.muted,
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        userSelect: "none",
      }}
    >
      {props.children}
    </text>
  )
}

function RulerTicks(props: { duration: number; pxPerSecond: number }) {
  const ticks = createMemo(() => {
    const entries: Array<{ seconds: number; left: number }> = []
    const step = tickStep(props.pxPerSecond)
    for (let seconds = 0; seconds <= props.duration; seconds += step) {
      entries.push({ seconds, left: seconds * props.pxPerSecond })
    }
    return entries
  })

  return (
    <For each={ticks()}>
      {(tick) => (
        <>
          <div
            style={{
              position: "absolute",
              left: tick.left,
              top: 0,
              width: 1,
              height: RULER_HEIGHT,
              backgroundColor: C.border,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: tick.left + 5,
              top: 7,
              pointerEvents: "none",
            }}
          >
            <Label size={10} color={C.faint}>{String(Math.round(tick.seconds))}</Label>
          </div>
        </>
      )}
    </For>
  )
}

function TrackHeaders(props: {
  rows: GeometryRow[]
  collapsed: ReadonlySet<string>
  onToggle: (trackId: string) => void
}) {
  return (
    <For each={props.rows}>
      {(row) => (
        <div
          testId={`track-header-${row.track.id}`}
          style={{
            position: "absolute",
            left: 0,
            top: row.top,
            width: HEADER_WIDTH,
            height: row.height,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingLeft: 10,
            paddingRight: 10,
            borderBottomWidth: 1,
            borderColor: C.borderSoft,
            backgroundColor: C.chrome,
            cursor: "pointer",
            userSelect: "none",
            hover: { backgroundColor: "#212129" },
          }}
          onClick={() => props.onToggle(row.track.id)}
        >
          <Label size={10} color={C.faint}>
            {props.collapsed.has(row.track.id) ? "▸" : "▾"}
          </Label>
          <Label size={12} color={C.text}>{row.track.name}</Label>
        </div>
      )}
    </For>
  )
}

function Waveform(props: { project: Project; clip: Clip; width: number }) {
  const bars = createMemo(() => {
    const barWidth = 2
    const gap = 1
    const count = Math.min(240, Math.max(0, Math.floor(props.width / (barWidth + gap))))
    const result: Array<{ key: number; height: number }> = []
    for (let index = 0; index < count; index += 1) {
      const seconds =
        props.clip.start + (index / Math.max(1, count)) * props.clip.duration
      const sample = props.project.waveform[Math.floor(seconds * WAVEFORM_HZ)] ?? 0.2
      result.push({ key: index, height: Math.max(2, sample * 26) })
    }
    return result
  })

  return (
    <div
      style={{
        position: "absolute",
        left: 6,
        bottom: 4,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 1,
        height: 26,
        pointerEvents: "none",
      }}
    >
      <For each={bars()}>
        {(bar) => (
          <div
            style={{
              width: 2,
              height: bar.height,
              backgroundColor: "#5FE3B0",
              opacity: 0.75,
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
        )}
      </For>
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
  testId: string
  gesture: GestureHandlers
}

function ClipView(props: ClipViewProps) {
  const color = () => CLIP_COLORS[props.clip.kind]
  const width = () => Math.max(2, props.clip.duration * props.pxPerSecond)

  return (
    <div
      testId={props.testId}
      style={{
        position: "absolute",
        left: props.clip.start * props.pxPerSecond,
        top: props.top + CLIP_INSET,
        width: width(),
        height: props.height - CLIP_INSET * 2,
        borderRadius: 4,
        backgroundColor: color().fill,
        borderWidth: props.selected ? 2 : 1,
        borderColor: props.selected ? C.selection : "#00000059",
        opacity: props.ghost ? 0.35 : 1,
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
        hover: { backgroundColor: color().hover },
        active: { cursor: "grabbing" },
      }}
      onMouseDown={(event) => props.gesture.begin("move", props.clip, event)}
      onMouseMove={props.gesture.move}
      onMouseUp={props.gesture.end}
    >
      <Show when={props.clip.kind === "audio" && width() > 24}>
        <Waveform project={props.project} clip={props.clip} width={width()} />
      </Show>
      <Show when={width() > 22}>
        <div style={{ paddingLeft: 6, paddingTop: 3, paddingRight: 4 }}>
          <Label size={11} color={color().text}>{props.clip.label}</Label>
        </div>
      </Show>
      <Show when={width() > TRIM_HANDLE_WIDTH * 3}>
        <div
          testId={`${props.testId}-trim-start`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: TRIM_HANDLE_WIDTH,
            cursor: "col-resize",
            backgroundColor: "#FFFFFF14",
            hover: { backgroundColor: "#FFFFFF3D" },
          }}
          onMouseDown={(event) => props.gesture.begin("trim-start", props.clip, event)}
          onMouseMove={props.gesture.move}
          onMouseUp={props.gesture.end}
        />
        <div
          testId={`${props.testId}-trim-end`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: TRIM_HANDLE_WIDTH,
            cursor: "col-resize",
            backgroundColor: "#FFFFFF14",
            hover: { backgroundColor: "#FFFFFF3D" },
          }}
          onMouseDown={(event) => props.gesture.begin("trim-end", props.clip, event)}
          onMouseMove={props.gesture.move}
          onMouseUp={props.gesture.end}
        />
      </Show>
    </div>
  )
}

function ClipLayer(props: {
  project: Project
  clips: Clip[]
  geometry: Geometry
  pxPerSecond: number
  selection: ReadonlySet<string>
  draggingClipId: string | null
  gesture: GestureHandlers
}) {
  return (
    <>
      <For each={props.geometry.rows}>
        {(row, index) => (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: row.top,
              width: props.geometry.contentWidth,
              height: row.height,
              backgroundColor: index() % 2 === 0 ? C.rowEven : C.rowOdd,
              borderBottomWidth: 1,
              borderColor: C.borderSoft,
              pointerEvents: "none",
            }}
          />
        )}
      </For>
      <For each={props.clips}>
        {(clip) => (
          <ClipView
            project={props.project}
            clip={clip}
            top={props.geometry.rowTops.get(clip.trackId) ?? 0}
            height={rowHeightOf(props.geometry, clip.trackId)}
            pxPerSecond={props.pxPerSecond}
            selected={props.selection.has(clip.id)}
            ghost={clip.id === props.draggingClipId}
            testId={`clip-${clip.id}`}
            gesture={props.gesture}
          />
        )}
      </For>
    </>
  )
}

const MEDIA_THUMB_WIDTH = 96
const MEDIA_THUMB_GAP = 6
const MEDIA_COLUMNS = 8
const MEDIA_ROW_WIDTH =
  MEDIA_COLUMNS * MEDIA_THUMB_WIDTH + (MEDIA_COLUMNS - 1) * MEDIA_THUMB_GAP

function MediaBin() {
  const rows = Array.from({ length: 12 }, (_, row) => row)
  const columns = Array.from({ length: MEDIA_COLUMNS }, (_, column) => column)
  return (
    <div
      testId="media-bin"
      style={{
        width: 260,
        height: 220,
        overflow: "scroll",
        display: "flex",
        flexDirection: "column",
        gap: MEDIA_THUMB_GAP,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.panel,
      }}
    >
      <For each={rows}>
        {(row) => (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: MEDIA_THUMB_GAP,
              width: MEDIA_ROW_WIDTH,
              flexShrink: 0,
            }}
          >
            <For each={columns}>
              {(column) => (
                <div
                  style={{
                    width: MEDIA_THUMB_WIDTH,
                    height: 54,
                    flexShrink: 0,
                    borderRadius: 4,
                    backgroundColor: column % 2 === row % 2 ? "#242430" : "#2C2C3A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Label size={10} color={C.faint}>{`${row}-${column}`}</Label>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}

export interface TimelineAppProps {
  trackCount?: number
  durationSeconds?: number
  viewportWidth?: number
  viewportHeight?: number
  cull?: boolean
}

export function TimelineApp(props: TimelineAppProps = {}) {
  const windowSize = useWindowSize()
  const viewportWidth = createMemo(() => props.viewportWidth ?? windowSize.width)
  const viewportHeight = createMemo(() => props.viewportHeight ?? windowSize.height)

  const [project, setProject] = createSignal<Project>(
    createProject({
      trackCount: props.trackCount,
      durationSeconds: props.durationSeconds,
    }),
  )
  const [viewport, setViewport] = createSignal<Viewport>({
    scrollX: 0,
    scrollY: 0,
    pxPerSecond: 24,
  })
  const [playhead, setPlayhead] = createSignal(3.5)
  const [selection, setSelection] = createSignal<ReadonlySet<string>>(new Set<string>())
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set<string>())
  const [drag, setDrag] = createSignal<DragState | null>(null)
  const [cull, setCull] = createSignal(props.cull ?? true)
  const [log, setLog] = createSignal<string[]>([])

  const bodyHeight = createMemo(() => {
    const rowsHeight = project().tracks.reduce(
      (total, track) => total + trackHeight(track),
      0,
    )
    return Math.max(120, Math.min(rowsHeight, Math.round(viewportHeight() * 0.42)))
  })

  const geometryBase = createMemo(() =>
    buildGeometry({
      project: project(),
      pxPerSecond: viewport().pxPerSecond,
      viewportWidth: viewportWidth(),
      bodyHeight: bodyHeight(),
      collapsed: collapsed(),
    }),
  )
  const panelHeight = createMemo(() => RULER_HEIGHT + bodyHeight() + FOOTER_HEIGHT)
  const geometry = createMemo<Geometry>(() => ({
    ...geometryBase(),
    gridTop: viewportHeight() - panelHeight() + RULER_HEIGHT,
  }))
  const maxScrollX = createMemo(() =>
    Math.max(0, geometry().contentWidth - geometry().gridWidth),
  )
  const maxScrollY = createMemo(() =>
    Math.max(0, geometry().contentHeight - geometry().gridHeight),
  )

  let dragOwner: DragState | null = null
  let zoomOrigin: { left: number } | null = null

  const updateDrag = (next: DragState | null): void => {
    dragOwner = next
    setDrag(next)
  }
  const note = (entry: string): void => {
    setLog((entries) => [...entries, entry].slice(-8))
  }

  const preview = createMemo(() => {
    const current = drag()
    return current
      ? previewClip({
          drag: current,
          project: project(),
          geometry: geometry(),
          playhead: playhead(),
        })
      : null
  })

  const onWheel = (event: EventPayload): void => {
    const deltaX = event.deltaX ?? 0
    const deltaY = event.deltaY ?? 0
    const zoom = event.modifiers?.cmd || event.modifiers?.ctrl
    const currentViewport = viewport()
    const currentGeometry = geometry()

    if (zoom) {
      const pointerX = event.x ?? currentGeometry.gridLeft
      const timeUnderPointer =
        (pointerX - currentGeometry.gridLeft + currentViewport.scrollX) /
        currentViewport.pxPerSecond
      const pxPerSecond = clamp(
        currentViewport.pxPerSecond * Math.exp(deltaY * 0.005),
        MIN_PX_PER_SECOND,
        MAX_PX_PER_SECOND,
      )
      const contentWidth = project().durationSeconds * pxPerSecond
      const scrollX = clamp(
        timeUnderPointer * pxPerSecond - (pointerX - currentGeometry.gridLeft),
        0,
        Math.max(0, contentWidth - currentGeometry.gridWidth),
      )
      setViewport({ ...currentViewport, pxPerSecond, scrollX })
      return
    }

    const panX = event.modifiers?.shift ? -deltaY : -deltaX
    const panY = event.modifiers?.shift ? 0 : -deltaY
    setViewport({
      ...currentViewport,
      scrollX: clamp(currentViewport.scrollX + panX, 0, maxScrollX()),
      scrollY: clamp(currentViewport.scrollY + panY, 0, maxScrollY()),
    })
  }

  const beginDrag = (
    kind: DragKind,
    clip: Clip | null,
    event: EventPayload,
  ): void => {
    const currentViewport = viewport()
    const next: DragState = {
      kind,
      originX: event.x ?? 0,
      originY: event.y ?? 0,
      x: event.x ?? 0,
      y: event.y ?? 0,
      moved: false,
      clip,
      pxPerSecond: currentViewport.pxPerSecond,
      scrollX: currentViewport.scrollX,
      scrollY: currentViewport.scrollY,
    }
    updateDrag(next)
    note(`dragstart:${kind}${clip ? `:${clip.id}` : ""}`)
  }

  const beginClipDrag = (
    kind: DragKind,
    clip: Clip | null,
    event: EventPayload,
  ): void => {
    if (clip) {
      const additive = event.modifiers?.shift || event.modifiers?.cmd
      const current = selection()
      if (!additive) {
        setSelection(new Set([clip.id]))
      } else {
        const next = new Set(current)
        if (next.has(clip.id)) next.delete(clip.id)
        else next.add(clip.id)
        setSelection(next)
      }
    }
    beginDrag(kind, clip, event)
  }

  const secondsAtWindowX = (x: number): number => {
    const currentViewport = viewport()
    return clamp(
      (x - geometry().gridLeft + currentViewport.scrollX) /
        currentViewport.pxPerSecond,
      0,
      project().durationSeconds,
    )
  }

  const onRulerMouseDown = (event: EventPayload): void => {
    setPlayhead(secondsAtWindowX(event.x ?? 0))
    beginDrag("scrub", null, event)
  }

  const onGridMouseDown = (event: EventPayload): void => {
    if (!event.modifiers?.shift && !event.modifiers?.cmd) {
      setSelection(new Set<string>())
    }
    beginDrag("marquee", null, event)
  }

  const onGestureMove = (event: EventPayload): void => {
    const current = dragOwner
    if (!current) return
    const x = event.x ?? 0
    const y = event.y ?? 0
    const next: DragState = {
      ...current,
      x,
      y,
      moved:
        current.moved ||
        Math.abs(x - current.originX) > DRAG_THRESHOLD_PX ||
        Math.abs(y - current.originY) > DRAG_THRESHOLD_PX,
    }
    updateDrag(next)

    if (current.kind === "scrub") {
      setPlayhead(secondsAtWindowX(x))
      return
    }
    if (current.kind === "zoom" && zoomOrigin) {
      const ratio = clamp(
        (x - zoomOrigin.left) / ZOOM_SLIDER_WIDTH,
        0,
        1,
      )
      const pxPerSecond =
        MIN_PX_PER_SECOND *
        Math.pow(MAX_PX_PER_SECOND / MIN_PX_PER_SECOND, ratio)
      const contentWidth = project().durationSeconds * pxPerSecond
      const currentViewport = viewport()
      setViewport({
        ...currentViewport,
        pxPerSecond,
        scrollX: clamp(
          currentViewport.scrollX,
          0,
          Math.max(0, contentWidth - geometry().gridWidth),
        ),
      })
    }
  }

  const commitDrag = (): void => {
    const current = dragOwner
    if (!current) return
    updateDrag(null)
    zoomOrigin = null

    if (current.moved) {
      const result = previewClip({
        drag: current,
        project: project(),
        geometry: geometry(),
        playhead: playhead(),
      })
      if (result) {
        const nextClip = result.clip
        setProject((old) => ({
          ...old,
          clips: old.clips.map((clip) =>
            clip.id === nextClip.id ? nextClip : clip,
          ),
        }))
      }
      if (current.kind === "marquee") {
        setSelection(
          marqueeHits({
            drag: current,
            geometry: geometry(),
            project: project(),
          }),
        )
      }
    }
    note(`dragend:${current.kind}`)
  }

  const clipGesture: GestureHandlers = {
    begin: beginClipDrag,
    move: onGestureMove,
    end: commitDrag,
  }
  const chromeGesture: GestureHandlers = {
    begin: beginDrag,
    move: onGestureMove,
    end: commitDrag,
  }

  const onToggleTrack = (trackId: string): void => {
    const next = new Set(collapsed())
    if (next.has(trackId)) next.delete(trackId)
    else next.add(trackId)
    setCollapsed(next)
  }

  const visibleClips = createMemo(() => {
    const shown = collapsed().size === 0
      ? project().clips
      : project().clips.filter((clip) => !collapsed().has(clip.trackId))
    if (!cull()) return shown

    const currentViewport = viewport()
    const currentGeometry = geometry()
    const startSeconds = currentViewport.scrollX / currentViewport.pxPerSecond
    const endSeconds =
      (currentViewport.scrollX + currentGeometry.gridWidth) /
      currentViewport.pxPerSecond
    const topPx = currentViewport.scrollY
    const bottomPx = currentViewport.scrollY + currentGeometry.gridHeight
    return shown.filter((clip) => {
      if (clip.start > endSeconds || clip.start + clip.duration < startSeconds) return false
      const top = currentGeometry.rowTops.get(clip.trackId) ?? 0
      const height = rowHeightOf(currentGeometry, clip.trackId)
      return top <= bottomPx && top + height >= topPx
    })
  })

  const selectedClip = createMemo(() => {
    const first = selection().values().next().value as string | undefined
    return first
      ? project().clips.find((clip) => clip.id === first) ?? null
      : null
  })

  const readout = createMemo(() => {
    const currentViewport = viewport()
    return [
      `x=${Math.round(currentViewport.scrollX)}`,
      `y=${Math.round(currentViewport.scrollY)}`,
      `pps=${currentViewport.pxPerSecond.toFixed(2)}`,
      `head=${playhead().toFixed(2)}`,
      `clips=${visibleClips().length}/${project().clips.length}`,
    ].join(" ")
  })

  const selectionReadout = createMemo(() => {
    const clip = selectedClip()
    return clip
      ? `${clip.id} ${clip.trackId} ${clip.start.toFixed(2)} ${clip.duration.toFixed(2)}`
      : "none"
  })

  const zoomRatio = createMemo(() =>
    Math.log(viewport().pxPerSecond / MIN_PX_PER_SECOND) /
    Math.log(MAX_PX_PER_SECOND / MIN_PX_PER_SECOND),
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: C.app,
      }}
    >
      <div
        style={{
          flexGrow: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: 20,
        }}
      >
        <MediaBin />
        <div
          style={{
            flexGrow: 1,
            minWidth: 0,
            height: "100%",
            borderRadius: 10,
            backgroundColor: "#0B0B0E",
            borderWidth: 1,
            borderColor: C.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Label size={13} color={C.faint}>{formatTimecode(playhead())}</Label>
        </div>
      </div>

      <div
        testId="timeline-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          height: panelHeight(),
          flexShrink: 0,
          borderTopWidth: 1,
          borderColor: C.border,
          backgroundColor: C.panel,
        }}
        onScroll={onWheel}
      >
        <div style={{ display: "flex", flexDirection: "row", height: RULER_HEIGHT }}>
          <div
            style={{
              width: HEADER_WIDTH,
              flexShrink: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 10,
              paddingRight: 10,
              backgroundColor: C.chrome,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: C.border,
            }}
          >
            <Label size={11}>Timeline</Label>
            <Label size={11} color={C.text}>{formatTimecode(playhead())}</Label>
          </div>
          <div
            testId="timeline-ruler"
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: RULER_HEIGHT,
              overflow: "hidden",
              position: "relative",
              backgroundColor: C.chrome,
              borderBottomWidth: 1,
              borderColor: C.border,
              cursor: "col-resize",
            }}
            onMouseDown={onRulerMouseDown}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: "absolute",
                left: -viewport().scrollX,
                top: 0,
                width: geometry().contentWidth,
                height: RULER_HEIGHT,
                pointerEvents: "none",
              }}
            >
              <RulerTicks
                duration={project().durationSeconds}
                pxPerSecond={viewport().pxPerSecond}
              />
              <div
                testId="timeline-playhead"
                style={{
                  position: "absolute",
                  left: playhead() * viewport().pxPerSecond - 4,
                  top: 4,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: C.playhead,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "row", height: bodyHeight() }}>
          <div
            style={{
              width: HEADER_WIDTH,
              flexShrink: 0,
              height: bodyHeight(),
              overflow: "hidden",
              position: "relative",
              backgroundColor: C.chrome,
              borderRightWidth: 1,
              borderColor: C.border,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -viewport().scrollY,
                width: HEADER_WIDTH,
                height: geometry().contentHeight,
                pointerEvents: "none",
              }}
            >
              <TrackHeaders
                rows={geometry().rows}
                collapsed={collapsed()}
                onToggle={onToggleTrack}
              />
            </div>
          </div>

          <div
            testId="timeline-grid"
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: bodyHeight(),
              overflow: "hidden",
              position: "relative",
              backgroundColor: C.grid,
            }}
            onMouseDown={onGridMouseDown}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: "absolute",
                left: -viewport().scrollX,
                top: -viewport().scrollY,
                width: geometry().contentWidth,
                height: geometry().contentHeight,
                pointerEvents: "none",
              }}
            >
              <ClipLayer
                project={project()}
                clips={visibleClips()}
                geometry={geometry()}
                pxPerSecond={viewport().pxPerSecond}
                selection={selection()}
                draggingClipId={preview()?.clip.id ?? null}
                gesture={clipGesture}
              />
              <Show when={preview()}>
                {(current) => (
                  <ClipView
                    project={project()}
                    clip={current().clip}
                    top={geometry().rowTops.get(current().clip.trackId) ?? 0}
                    height={rowHeightOf(geometry(), current().clip.trackId)}
                    pxPerSecond={viewport().pxPerSecond}
                    selected={true}
                    ghost={false}
                    testId="clip-preview"
                    gesture={clipGesture}
                  />
                )}
              </Show>
              <Show when={preview()?.guide}>
                {(guide) => (
                  <div
                    testId="snap-guide"
                    style={{
                      position: "absolute",
                      left: guide() * viewport().pxPerSecond,
                      top: 0,
                      width: 1,
                      height: geometry().contentHeight,
                      backgroundColor: C.snap,
                      pointerEvents: "none",
                    }}
                  />
                )}
              </Show>
              <div
                style={{
                  position: "absolute",
                  left: playhead() * viewport().pxPerSecond,
                  top: 0,
                  width: 2,
                  height: geometry().contentHeight,
                  backgroundColor: C.playhead,
                  pointerEvents: "none",
                }}
              />
            </div>
            <Show when={drag()?.kind === "marquee" && drag()?.moved}>
              {() => {
                const current = drag()
                if (!current) return null
                return (
                  <div
                    testId="marquee"
                    style={{
                      position: "absolute",
                      left: Math.min(current.originX, current.x) - geometry().gridLeft,
                      top: Math.min(current.originY, current.y) - geometry().gridTop,
                      width: Math.abs(current.x - current.originX),
                      height: Math.abs(current.y - current.originY),
                      backgroundColor: C.marquee,
                      borderWidth: 1,
                      borderColor: C.accent,
                      pointerEvents: "none",
                    }}
                  />
                )
              }}
            </Show>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            height: FOOTER_HEIGHT,
            paddingLeft: 10,
            paddingRight: 10,
            borderTopWidth: 1,
            borderColor: C.border,
            backgroundColor: C.chrome,
          }}
        >
          <Label size={11} color={C.text}>{project().name}</Label>
          <div
            testId="zoom-slider"
            style={{
              position: "relative",
              width: ZOOM_SLIDER_WIDTH,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.border,
              cursor: "ew-resize",
            }}
            onMouseDown={(event) => {
              zoomOrigin = {
                left: (event.x ?? 0) - zoomRatio() * ZOOM_SLIDER_WIDTH,
              }
              chromeGesture.begin("zoom", null, event)
            }}
            onMouseMove={chromeGesture.move}
            onMouseUp={chromeGesture.end}
          >
            <div
              style={{
                position: "absolute",
                left: zoomRatio() * ZOOM_SLIDER_WIDTH - 5,
                top: -3,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: C.accent,
                pointerEvents: "none",
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
              backgroundColor: cull() ? "#26364F" : "#242430",
              cursor: "pointer",
              hover: { backgroundColor: "#2E4160" },
            }}
            onClick={() => setCull((value) => !value)}
          >
            <Label size={10} color={cull() ? C.accent : C.faint}>
              {cull() ? "cull on" : "cull off"}
            </Label>
          </div>
          <text testId="readout" style={{ fontSize: 10, color: C.faint, userSelect: "none" }}>
            {readout()}
          </text>
          <text testId="selection" style={{ fontSize: 10, color: C.faint, userSelect: "none" }}>
            {selectionReadout()}
          </text>
          <text testId="events" style={{ fontSize: 10, color: C.faint, userSelect: "none" }}>
            {log().join(" ")}
          </text>
        </div>
      </div>
    </div>
  )
}
