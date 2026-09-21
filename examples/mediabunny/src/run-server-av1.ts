const { registerMediabunnyServer } = await import("@mediabunny/server")
registerMediabunnyServer()

const { runVideoCodecRoundTripForCodec } = await import("./suite.ts")
const result = await runVideoCodecRoundTripForCodec("mediabunny-server", "av1")
console.log(JSON.stringify(result))
