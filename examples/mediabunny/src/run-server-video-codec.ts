const codec = process.argv[2]
if (codec !== "av1" && codec !== "prores") {
  throw new Error(`Unsupported isolated server video codec: ${codec ?? "<missing>"}`)
}

const { registerMediabunnyServer } = await import("@mediabunny/server")
registerMediabunnyServer()

const { runVideoCodecRoundTripForCodec } = await import("./suite.ts")
const result = await runVideoCodecRoundTripForCodec("mediabunny-server", codec)
console.log(JSON.stringify(result))
