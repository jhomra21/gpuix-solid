const OWNER_WARNING = "computations created outside a `createRoot` or `render` will never be disposed"
const originalWarn = console.warn
let ownerWarnings = 0

console.warn = (...args) => {
  if (args[0] === OWNER_WARNING) ownerWarnings += 1
  originalWarn(...args)
}

try {
  if (process.platform === "win32") {
    console.log("solid1 DAW showcase: native execution skipped on Windows hosted runner")
  } else {
    await import("../dist/test/test.js")
    if (ownerWarnings !== 0) {
      throw new Error(`solid1 DAW emitted ${ownerWarnings} unowned Solid computation warning(s)`)
    }
  }
} finally {
  console.warn = originalWarn
}
