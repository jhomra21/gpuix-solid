if (process.platform === "win32") {
  console.log("solid1 Kobalte showcase: native execution skipped on Windows hosted runner")
} else {
  await import("../dist/test/test.js")
}
