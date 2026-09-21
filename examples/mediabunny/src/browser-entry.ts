import { runMediaBunnyBenchmark } from "./suite.ts"

const reportNode = document.querySelector("#report")
if (!(reportNode instanceof HTMLElement)) {
  throw new Error("MediaBunny browser benchmark is missing its report node")
}

try {
  const report = await runMediaBunnyBenchmark("browser-webcodecs")
  reportNode.textContent = JSON.stringify(report)
  document.body.dataset.status = "ready"
} catch (error) {
  reportNode.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error)
  document.body.dataset.status = "error"
}
