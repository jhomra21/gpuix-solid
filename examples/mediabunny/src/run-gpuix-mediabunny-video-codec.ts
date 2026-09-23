await import("@napi-rs/webcodecs/polyfill")

const codec = process.argv[2]
if (codec !== "av1" && codec !== "prores") {
  throw new Error("Unsupported isolated GPUix MediaBunny video codec: " + (codec ?? "<missing>"))
}

const { registerGpuixMediaBunny } = await import("@jhomra21/gpuix-mediabunny")
registerGpuixMediaBunny()

const { runVideoCodecRoundTripForCodec } = await import("./suite.ts")
const result = await runVideoCodecRoundTripForCodec("gpuix-mediabunny", codec)
console.log(JSON.stringify(result))
