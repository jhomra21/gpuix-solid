import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const OWNER_WARNING = "computations created outside a `createRoot` or `render` will never be disposed"
const originalWarn = console.warn
const bundlePath = fileURLToPath(new URL("../dist/test/test.js", import.meta.url))
const bundleLines = process.platform === "win32" ? [] : readFileSync(bundlePath, "utf8").split("\n")
const printedLines = new Set()

console.warn = (...args) => {
  originalWarn(...args)
  if (args[0] !== OWNER_WARNING) return

  const stack = new Error("Solid owner warning diagnostic").stack ?? ""
  originalWarn(stack)
  const match = stack.match(/dist\/test\/test\.js:(\d+):(\d+)/)
  const line = match ? Number(match[1]) : 0
  if (line <= 0 || printedLines.has(line)) return
  printedLines.add(line)

  const start = Math.max(1, line - 8)
  const end = Math.min(bundleLines.length, line + 8)
  originalWarn(`--- owner warning bundle context ${start}-${end} ---`)
  for (let current = start; current <= end; current += 1) {
    originalWarn(`${String(current).padStart(5, " ")} | ${bundleLines[current - 1] ?? ""}`)
  }
}

try {
  if (process.platform === "win32") {
    console.log("solid1 DAW showcase: native execution skipped on Windows hosted runner")
  } else {
    await import("../dist/test/test.js")
  }
} finally {
  console.warn = originalWarn
}
