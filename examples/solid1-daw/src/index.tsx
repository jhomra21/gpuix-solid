import { createSignal } from "solid-js"
import {
  configureNativeStyleManifest,
  render,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

type PerformanceSnapshot = {
  fps: number
  frameDeltaMs: number
  drawCurrentMs?: number
  drawP90Ms?: number
  drawP99Ms?: number
  drawMaxMs?: number
  frames: number
}

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

const [performanceSnapshot, setPerformanceSnapshot] = createSignal<PerformanceSnapshot>({
  fps: 0,
  frameDeltaMs: 0,
  frames: 0,
})

function metric(value: number | undefined): string {
  return value === undefined ? "--" : value.toFixed(1)
}

const handle = render(() => (
  <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
    <DawSolid1Showcase />
    <div
      testId="daw-performance-hud"
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 190,
        padding: 9,
        gap: 2,
        borderWidth: 1,
        borderColor: "#3F3F46",
        borderRadius: 8,
        backgroundColor: "#111113EE",
        pointerEvents: "none",
      }}
    >
      <text style={{ color: "#FAFAFA", fontSize: 11, fontWeight: 700 }}>PERFORMANCE</text>
      <text style={{ color: "#D4D4D8", fontSize: 10 }}>{`RENDER FPS  ${metric(performanceSnapshot().fps)}`}</text>
      <text style={{ color: "#D4D4D8", fontSize: 10 }}>{`FRAME Δ AVG  ${metric(performanceSnapshot().frameDeltaMs)} ms`}</text>
      <text style={{ color: "#D4D4D8", fontSize: 10 }}>{`DRAW CUR  ${metric(performanceSnapshot().drawCurrentMs)} ms`}</text>
      <text style={{ color: "#A1A1AA", fontSize: 9 }}>{`DRAW P90/P99  ${metric(performanceSnapshot().drawP90Ms)} / ${metric(performanceSnapshot().drawP99Ms)} ms`}</text>
      <text style={{ color: "#A1A1AA", fontSize: 9 }}>{`DRAW MAX  ${metric(performanceSnapshot().drawMaxMs)} ms · ${performanceSnapshot().frames} frames`}</text>
    </div>
  </div>
), {
  title: "DAW Browser — Solid 1 + GPUIX",
  width: 1440,
  height: 900,
  debugFrameOverlay: "minimal",
})

handle.renderer.resetDebugFrameOverlayStats?.()
let previousFrames = 0
let previousAt = Date.now()
setInterval(() => {
  const stats = handle.renderer.getDebugFrameOverlayStats?.()
  if (!stats) return
  const now = Date.now()
  const elapsedMs = Math.max(1, now - previousAt)
  const rendered = Math.max(0, stats.frames - previousFrames)
  const fps = rendered * 1000 / elapsedMs
  setPerformanceSnapshot({
    fps,
    frameDeltaMs: rendered > 0 ? elapsedMs / rendered : 0,
    drawCurrentMs: stats.currentMs,
    drawP90Ms: stats.p90Ms,
    drawP99Ms: stats.p99Ms,
    drawMaxMs: stats.maxMs,
    frames: stats.frames,
  })
  previousFrames = stats.frames
  previousAt = now
}, 500)
