await import("@napi-rs/webcodecs/polyfill")

const { runMediaBunnyBenchmark } = await import("./suite.ts")
const report = await runMediaBunnyBenchmark("napi-webcodecs")
console.log(JSON.stringify(report, null, 2))
