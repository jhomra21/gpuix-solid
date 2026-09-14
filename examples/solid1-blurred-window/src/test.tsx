import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { BlurredWindowApp } from "./app"

const screenshotPath = "/tmp/gpuix-solid1-blurred-window.png"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  }
}

if (!hasNativeTestRenderer) {
  console.log("solid1 blurred-window source fixture: native TestGpuixRenderer unavailable; skipped")
} else {
  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const app = createTestRoot(760, 510)
  app.render(() => <BlurredWindowApp />)
  const r = app.renderer
  const text = r.textContentRoot()

  for (const expected of [
    "SUNDAY, AUGUST 30",
    "Good morning, Tommy",
    "Cupertino · 21°",
    "FOCUS TIME",
    "3h 24m",
    "TASKS DONE",
    "8 / 11",
    "ENERGY",
    "High",
    "Today",
    "A light plan for a quiet Sunday",
    "09:30",
    "Review the GPUI window API",
    "11:00",
    "Build the glass example",
    "14:30",
    "Walk and reset",
    "NOW PLAYING",
    "Soft Focus",
    "Leavv",
    "2:08",
    "3:24",
    "INTENTION",
    "Make one thing clear and useful.",
  ]) {
    requireText(text, expected, "upstream blurred-window surface")
  }

  const greeting = r.boundsText("Good morning, Tommy")
  const weather = r.boundsText("Cupertino · 21°")
  const focus = r.boundsText("FOCUS TIME")
  const tasks = r.boundsText("TASKS DONE")
  const energy = r.boundsText("ENERGY")
  const today = r.boundsText("Today")
  const nowPlaying = r.boundsText("NOW PLAYING")
  const intention = r.boundsText("INTENTION")

  requireCondition(greeting.width > 0 && greeting.height > 0, "greeting should paint")
  requireCondition(weather.x > greeting.x, "weather pill should remain to the right of the greeting")
  requireCondition(focus.y > greeting.y, "metric row should remain below the header")
  requireCondition(tasks.y === focus.y && energy.y === focus.y, "three metric cards should remain on one row")
  requireCondition(tasks.x > focus.x && energy.x > tasks.x, "metric cards should preserve source order")
  requireCondition(today.y > focus.y, "Today panel should remain below metrics")
  requireCondition(nowPlaying.x > today.x, "Now Playing column should remain to the right of Today")
  requireCondition(intention.x === nowPlaying.x && intention.y > nowPlaying.y, "Intention card should remain below Now Playing")

  r.captureScreenshot(screenshotPath)
  requireCondition(existsSync(screenshotPath), "blurred-window screenshot should be written")
  requireCondition(statSync(screenshotPath).size > 0, "blurred-window screenshot should not be empty")

  app.unmount()
  console.log("solid1 source-faithful blurred-window fixture: passed")
}
