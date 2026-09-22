const { installNapiCanvasGlobals } = await import("./napi-canvas-globals.ts")
installNapiCanvasGlobals()

const { registerGpuixMediaBunny } = await import("./gpuix-mediabunny.ts")
registerGpuixMediaBunny()

const {
  refreshMediaBunnyBenchmarkSummary,
  runMediaBunnyBenchmark,
} = await import("./suite.ts")

const ISOLATED_VIDEO_CODECS = ["av1", "prores"] as const
const report = await runMediaBunnyBenchmark("gpuix-mediabunny", {
  skipVideoCodecRoundTrips: ISOLATED_VIDEO_CODECS,
})

const timeoutMs = Number(process.env.MEDIABUNNY_SERVER_CODEC_TIMEOUT_MS ?? 30_000)

async function runIsolatedVideoCodec(codec: typeof ISOLATED_VIDEO_CODECS[number]) {
  const child = Bun.spawn(
    [process.execPath, "src/run-gpuix-mediabunny-video-codec.ts", codec],
    {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    },
  )

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill("SIGKILL")
  }, timeoutMs)

  const stdoutPromise = new Response(child.stdout).text()
  const stderrPromise = new Response(child.stderr).text()
  const exitCode = await child.exited
  clearTimeout(timer)

  const stdout = await stdoutPromise
  const stderr = await stderrPromise

  if (timedOut) {
    return {
      codec,
      status: "timeout" as const,
      note: "Isolated GPUix MediaBunny " + codec + " round trip exceeded " + timeoutMs + " ms and was terminated.",
    }
  }

  if (exitCode !== 0) {
    return {
      codec,
      status: "error" as const,
      error: stderr.trim() || ("Isolated " + codec + " probe exited with code " + exitCode),
    }
  }

  return JSON.parse(stdout)
}

for (const codec of ISOLATED_VIDEO_CODECS) {
  const index = report.codecRoundTrips.video.findIndex((entry) => entry.codec === codec)
  if (index < 0) {
    throw new Error("GPUix MediaBunny report is missing its " + codec + " slot")
  }
  report.codecRoundTrips.video[index] = await runIsolatedVideoCodec(codec)
}

refreshMediaBunnyBenchmarkSummary(report)
console.log(JSON.stringify(report, null, 2))
if (report.summary.errors > 0) process.exitCode = 1
