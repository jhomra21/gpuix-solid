if (process.platform === "win32") {
  console.log("solid1 blurred-window native fixture: native execution skipped on Windows hosted runner")
} else {
  await import("../dist/test/test.js")
}
