import {
  createTestRoot,
  hasNativeTestRenderer,
  type TestRoot,
} from "gpuix-solid"
import {
  FOOTER_HEIGHT,
  HEADER_WIDTH,
  RULER_HEIGHT,
  TimelineApp,
  trackHeight,
} from "../timeline/app"
import { createProject, type Clip } from "../timeline/data"
import { report } from "./stats"

const WIDTH = 1_280
const HEIGHT = 800
const TRACK_COUNT = 24
const DURATION_SECONDS = 900
const PX_PER_SECOND = 24
const WARMUP = 5
const SAMPLES = 40
const WHEEL_AT = { x: 700, y: 600 }

const project = createProject({ trackCount: TRACK_COUNT, durationSeconds: DURATION_SECONDS })
const contentHeight = project.tracks.reduce(
  (total, track) => total + trackHeight(track),
  0,
)
const bodyHeight = Math.max(120, Math.min(contentHeight, Math.round(HEIGHT * 0.42)))
const panelHeight = RULER_HEIGHT + bodyHeight + FOOTER_HEIGHT
const gridTop = HEIGHT - panelHeight + RULER_HEIGHT

function mount(cull: boolean): TestRoot {
  const root = createTestRoot(WIDTH, HEIGHT)
  root.render(() => (
    <TimelineApp
      trackCount={TRACK_COUNT}
      durationSeconds={DURATION_SECONDS}
      viewportWidth={WIDTH}
      viewportHeight={HEIGHT}
      cull={cull}
    />
  ))
  return root
}

function panSamples(root: TestRoot): number[] {
  const samples: number[] = []
  for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
    const direction = Math.floor(index / 8) % 2 === 0 ? -1 : 1
    const started = performance.now()
    root.renderer.nativeSimulateScrollWheel(
      WHEEL_AT.x,
      WHEEL_AT.y,
      direction * 24,
      direction * 12,
    )
    const elapsed = performance.now() - started
    if (index >= WARMUP) samples.push(elapsed)
  }
  return samples
}

function rowCenterY(trackId: string): number {
  let top = 0
  for (const track of project.tracks) {
    const height = trackHeight(track)
    if (track.id === trackId) return gridTop + top + height / 2
    top += height
    if (top > bodyHeight) break
  }
  throw new Error(`No visible timeline row for ${trackId}`)
}

function pickVisibleClip(): Clip {
  for (const track of project.tracks) {
    let centerY: number
    try {
      centerY = rowCenterY(track.id)
    } catch {
      break
    }
    if (centerY > gridTop + bodyHeight) break
    const clip = project.clips.find(
      (candidate) =>
        candidate.trackId === track.id &&
        candidate.start > 1 &&
        candidate.start < 12 &&
        candidate.duration > 3,
    )
    if (clip) return clip
  }
  throw new Error("Timeline benchmark could not find a visible draggable clip")
}

function benchmarkMount(): void {
  const started = performance.now()
  const root = mount(true)
  try {
    root.renderer.flush()
    console.log(
      `[timeline.perf] mount tracks=${project.tracks.length} clips=${project.clips.length} ` +
        `${(performance.now() - started).toFixed(2)}ms`,
    )
  } finally {
    root.unmount()
  }
}

function benchmarkPan(cull: boolean): void {
  const root = mount(cull)
  try {
    root.renderer.flush()
    report("timeline.perf", `pan cull=${cull ? "on" : "off"}`, panSamples(root))
  } finally {
    root.unmount()
  }
}

function benchmarkDrag(): void {
  const root = mount(true)
  try {
    root.renderer.flush()
    const clip = pickVisibleClip()
    const startX = HEADER_WIDTH + (clip.start + Math.min(clip.duration / 2, 1.5)) * PX_PER_SECOND
    const startY = rowCenterY(clip.trackId)
    root.renderer.nativeSimulateMouseDown(startX, startY, 0)

    const samples: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const started = performance.now()
      root.renderer.nativeSimulateMouseMove(startX + index * 3, startY, 0)
      const elapsed = performance.now() - started
      if (index >= WARMUP) samples.push(elapsed)
    }
    root.renderer.nativeSimulateMouseUp(startX + 120, startY, 0)
    report("timeline.perf", "drag move", samples)
  } finally {
    root.unmount()
  }
}

function main(): void {
  if (!hasNativeTestRenderer) {
    console.log("timeline.perf: native TestGpuixRenderer unavailable; skipped")
    return
  }

  console.log(
    "[timeline.perf] workload matches the upstream GPUIX React 0.7 Timeline benchmark: " +
      "24 tracks, 900 seconds, cull-on/cull-off pan, and pointer-captured clip drag.",
  )
  console.log(
    "[timeline.perf] upstream React reference budgets: mount 400ms, cull-on pan p95 18ms/max 34ms, " +
      "drag p95 22ms/max 40ms, cull-off control p95 400ms/max 600ms.",
  )
  benchmarkMount()
  benchmarkPan(true)
  benchmarkPan(false)
  benchmarkDrag()
}

main()
