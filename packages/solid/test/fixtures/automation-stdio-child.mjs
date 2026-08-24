import { serveAutomationStdio } from "../../src/automation/server.ts"

let clicked = false
let value = ""
let nowMs = 0

const backend = {
  getTree() {
    return {
      id: 1,
      type: "div",
      testId: "root",
      children: [
        {
          id: 2,
          type: "div",
          testId: "action",
          text: clicked ? "Clicked" : "Ready",
          bounds: { x: 10, y: 20, width: 100, height: 40 },
        },
        {
          id: 3,
          type: "input",
          testId: "field",
          text: value,
          bounds: { x: 10, y: 70, width: 200, height: 40 },
        },
      ],
    }
  },
  getBounds(elementId) {
    if (elementId === 2) return { x: 10, y: 20, width: 100, height: 40 }
    if (elementId === 3) return { x: 10, y: 70, width: 200, height: 40 }
    return null
  },
  click() {
    clicked = true
  },
  keystrokes(_elementId, keys) {
    const parts = keys.split(" ")
    value = parts.slice(1).map((key) => key === "space" ? " " : key).join("")
  },
  screenshot() {},
  clockPause() {
    return nowMs
  },
  clockSet(next) {
    nowMs = next
    return nowMs
  },
  clockFastForward(delta) {
    nowMs += delta
    return nowMs
  },
  clockResume() {
    return nowMs
  },
  close() {},
}

serveAutomationStdio(backend)
