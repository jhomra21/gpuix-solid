await import("@napi-rs/webcodecs/polyfill")

const { installNapiCanvasGlobals } = await import("./napi-canvas-globals.ts")
installNapiCanvasGlobals()

const { registerNapiVideoSampleTransformer } = await import("./napi-video-transformer.ts")
registerNapiVideoSampleTransformer()

const { runMediaBunnyBenchmark } = await import("./suite.ts")
const report = await runMediaBunnyBenchmark("napi-webcodecs")
console.log(JSON.stringify(report, null, 2))
