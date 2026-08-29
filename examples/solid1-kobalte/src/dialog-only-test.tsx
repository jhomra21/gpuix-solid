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

function dispatchPointerDown(target: Element): void {
  const event = new Event("pointerdown", { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    target: { configurable: true, value: target },
    pointerType: { configurable: true, value: "mouse" },
    button: { configurable: true, value: 0 },
    ctrlKey: { configurable: true, value: false },
  })
  document.dispatchEvent(event)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 dialog-only Kobalte probe: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const renderer = app.renderer
  app.render(() => (
    <div style={{ width: "100%", height: "100%", padding: 24, gap: 16 }}>
      <div id="dialog-probe-outside" testId="dialog-probe-outside" onClick={() => undefined}>Outside</div>
      <div testId="dialog-probe"><DialogExample /></div>
    </div>
  ))

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "dialog-only open")
  await wait(0)
  await wait(0)
  renderer.flush()

  const outside = document.body.querySelectorAll('[id="dialog-probe-outside"]')[0]
  if (!outside) throw new Error("Expected dialog-only outside target")
  requireCondition(outside instanceof Element, "dialog-only outside target should be an Element")
  requireCondition(document.contains(outside), "dialog-only outside target should belong to document")

  dispatchPointerDown(outside)
  renderer.flush()
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "fresh Dialog should dismiss from browser-like outside pointerdown")

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "dialog-only native reopen")
  await wait(0)
  await wait(0)
  renderer.flush()
  renderer.clickTestId("dialog-probe-outside")
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "fresh Dialog should dismiss from native outside interaction")

  app.unmount()
  console.log("solid1 dialog-only Kobalte probe: passed")
}
