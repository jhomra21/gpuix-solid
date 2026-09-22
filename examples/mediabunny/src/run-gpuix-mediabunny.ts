await import("@napi-rs/webcodecs/polyfill")

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

  const stderrPromise = new Response(child.stderr).text()
  const reader = child.stdout.getReader()
  const decoder = new TextDecoder()
  let stdout = ""
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const result = await Promise.race([
      (async () => {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          stdout += decoder.decode(value, { stream: true })

          const newline = stdout.indexOf("\n")
          if (newline >= 0) {
            const line = stdout.slice(0, newline).trim()
            if (line) return JSON.parse(line)
            stdout = stdout.slice(newline + 1)
          }
        }

        stdout += decoder.decode()
        const line = stdout.trim()
        if (!line) {
          const exitCode = await child.exited
          const stderr = await stderrPromise
          throw new Error(
            stderr.trim()
            || ("Isolated " + codec + " probe exited with code " + exitCode + " without a result"),
          )
        }
        return JSON.parse(line)
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              "Isolated GPUix MediaBunny "
              + codec
              + " round trip exceeded "
              + timeoutMs
              + " ms",
            ),
          )
        }, timeoutMs)
      }),
    ])

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("exceeded " + timeoutMs + " ms")) {
      return {
        codec,
        status: "timeout" as const,
        note: message,
      }
    }

    return {
      codec,
      status: "error" as const,
      error: message,
    }
  } finally {
    if (timer) clearTimeout(timer)
    reader.releaseLock()
    if (child.exitCode === null) child.kill("SIGKILL")
    await child.exited
    await stderrPromise
  }
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
if (
  report.summary.unsupported > 0
  || report.summary.knownGaps > 0
  || report.summary.timeouts > 0
  || report.summary.errors > 0
) {
  process.exitCode = 1
}
