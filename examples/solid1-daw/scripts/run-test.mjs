const OWNER_WARNING = "computations created outside a `createRoot` or `render` will never be disposed"
const originalWarn = console.warn

console.warn = (...args) => {
  originalWarn(...args)
  if (args[0] === OWNER_WARNING) {
    originalWarn(new Error("Solid owner warning diagnostic").stack)
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
