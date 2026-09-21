const { registerMediabunnyServer } = await import("@mediabunny/server")
registerMediabunnyServer()

const {
  refreshMediaBunnyBenchmarkSummary,
  runMediaBunnyBenchmark,
} = await import("./suite.ts")

const report = await runMediaBunnyBenchmark("mediabunny-server", {
  skipVideoCodecRoundTrips: ["av1"],
})

const timeoutMs = Number(process.env.MEDIABUNNY_SERVER_AV1_TIMEOUT_MS ?? 30_000)
const child = Bun.spawn([process.execPath, "src/run-server-av1.ts"], {
  cwd: process.cwd(),
  stdout: "pipe",
  stderr: "pipe",
})

let timedOut = false
const timer = setTimeout(() => {
  timedOut = true
  child.kill()
}, timeoutMs)

const stdoutPromise = new Response(child.stdout).text()
const stderrPromise = new Response(child.stderr).text()
const exitCode = await child.exited
clearTimeout(timer)

const stdout = await stdoutPromise
const stderr = await stderrPromise
const av1Index = report.codecRoundTrips.video.findIndex((entry) => entry.codec === "av1")
if (av1Index < 0) throw new Error("MediaBunny server report is missing its AV1 slot")

if (timedOut) {
  report.codecRoundTrips.video[av1Index] = {
    codec: "av1",
    status: "timeout",
    note: `Isolated server AV1 round trip exceeded ${timeoutMs} ms and was terminated without blocking the rest of the benchmark.`,
  }
} else if (exitCode !== 0) {
  report.codecRoundTrips.video[av1Index] = {
    codec: "av1",
    status: "error",
    error: stderr.trim() || `Isolated AV1 probe exited with code ${exitCode}`,
  }
} else {
  report.codecRoundTrips.video[av1Index] = JSON.parse(stdout)
}

refreshMediaBunnyBenchmarkSummary(report)
console.log(JSON.stringify(report, null, 2))
if (report.summary.errors > 0) process.exitCode = 1
