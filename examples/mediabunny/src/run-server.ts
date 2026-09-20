import { registerMediabunnyServer } from "@mediabunny/server"

registerMediabunnyServer()

const { runMediaBunnyBenchmark } = await import("./suite.ts")
const report = await runMediaBunnyBenchmark("mediabunny-server")
console.log(JSON.stringify(report, null, 2))
