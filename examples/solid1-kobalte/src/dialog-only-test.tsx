import { configureNativeStyleManifest, createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { nativeKobalteManifest } from "./native-kobalte.generated"
import { BasicExample as DialogExample } from "./upstream/kobalte/examples/dialog"

configureNativeStyleManifest(nativeKobalteManifest)

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function settle(renderer: { flush(): void }): Promise<void> {
  await wait(0)
  renderer.flush()
  await wait(0)
  renderer.flush()
}

if (!hasNativeTestRenderer) {
  console.log("solid1 dialog-only Kobalte probe: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const renderer = app.renderer
  app.render(() => (
    <div style={{ width: "100%", height: "100%", padding: 24, gap: 16 }}>
      <div testId="dialog-probe-outside" onClick={() => undefined}>Outside</div>
      <div testId="dialog-probe"><DialogExample /></div>
    </div>
  ))

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "fresh Dialog open")
  await settle(renderer)

  renderer.clickTestId("dialog-probe-outside")
  await settle(renderer)
  requireCondition(
    !renderer.textContent("dialog-probe").includes("About Kobalte"),
    "first native outside interaction should dismiss a freshly mounted Dialog",
  )

  app.unmount()
  console.log("solid1 fresh native Dialog probe: passed")
}
