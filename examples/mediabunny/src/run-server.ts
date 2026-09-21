const { installNapiCanvasGlobals } = await import("./napi-canvas-globals.ts")
installNapiCanvasGlobals()

const { registerMediabunnyServer } = await import("@mediabunny/server")
registerMediabunnyServer()

const { runMediaBunnyBenchmark } = await import("./suite.ts")
const report = await runMediaBunnyBenchmark("mediabunny-server")
console.log(JSON.stringify(report, null, 2))
