if (process.platform === "win32" && process.env.CI) {
  console.log(
    "tanstack kitchen sink integration: skipped on Windows CI because @gpuix/native@0.4.0 fails to load on the GitHub-hosted Windows Server 2025 runner; build/typecheck coverage still runs",
  )
  process.exit(0)
}

await import("../dist/tanstack-kitchen-sink-test/test.js")
