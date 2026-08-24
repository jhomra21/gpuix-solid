if (process.platform === "win32" && process.env.CI) {
  console.log(
    "solid1 compatibility: native execution skipped on Windows CI because @gpuix/native@0.4.0 does not load on the hosted Windows runner; typecheck/build coverage still runs",
  )
  process.exit(0)
}

await import("../dist/test/test.js")
