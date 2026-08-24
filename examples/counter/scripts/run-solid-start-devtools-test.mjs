if (process.platform === "win32" && process.env.CI) {
  console.log(
    "solid-start-devtools integration: skipped on Windows CI because @gpuix/native@0.4.0 fails to load on the GitHub-hosted Windows Server 2025 runner; build/typecheck coverage still runs",
  )
  process.exit(0)
}

await import("../dist/solid-start-devtools-test/test.js")
