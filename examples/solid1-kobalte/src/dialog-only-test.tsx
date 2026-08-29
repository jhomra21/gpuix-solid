import { configureNativeStyleManifest, createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { layerStack } from "kobalte-layer-stack-probe"
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

async function settleDialog(renderer: { flush(): void }): Promise<void> {
  await wait(0)
  await wait(0)
  renderer.flush()
}

async function settlePresence(renderer: { flush(): void }): Promise<void> {
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
      <div id="dialog-probe-outside" testId="dialog-probe-outside" onClick={() => undefined}>Outside</div>
      <div testId="dialog-probe"><DialogExample /></div>
    </div>
  ))

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "dialog-only open")
  await settleDialog(renderer)

  const outside = document.body.querySelectorAll('[id="dialog-probe-outside"]')[0]
  if (!outside) throw new Error("Expected dialog-only outside target")
  requireCondition(outside instanceof Element, "dialog-only outside target should be an Element")
  requireCondition(document.contains(outside), "dialog-only outside target should belong to document")
  requireCondition(
    document.body.style.pointerEvents === "none",
    `modal Dialog onMount should disable body pointer events, got ${JSON.stringify(document.body.style.pointerEvents)}`,
  )

  const dialogContent = document.body.querySelectorAll('[role="dialog"]')[0]
  if (!(dialogContent instanceof HTMLElement)) throw new Error("Expected HTMLElement-compatible dialog content")
  requireCondition(layerStack.layers.length === 1, `fresh Dialog should register one layer, got ${layerStack.layers.length}`)
  requireCondition(layerStack.layers[0]?.node === dialogContent, "fresh Dialog layer should reference rendered dialog content")
  requireCondition(layerStack.isTopMostLayer(dialogContent), "fresh Dialog content should be topmost")
  requireCondition(!layerStack.isBelowPointerBlockingLayer(dialogContent), "fresh Dialog content should not be below pointer blocker")

  const dismiss = layerStack.layers[0]?.dismiss
  requireCondition(Boolean(dismiss), "fresh Dialog layer should expose its dismiss callback")
  dismiss?.()
  renderer.flush()
  await settlePresence(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "registered layer dismiss callback should unmount Dialog after presence settles")

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "dialog reopened for browser-like interaction")
  await settleDialog(renderer)

  dispatchPointerDown(outside)
  renderer.flush()
  await settlePresence(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "fresh Dialog should dismiss from browser-like outside pointerdown")

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "dialog-only native reopen")
  await settleDialog(renderer)

  const nativeDialogContent = document.body.querySelectorAll('[role="dialog"]')[0]
  if (!(nativeDialogContent instanceof HTMLElement)) throw new Error("Expected dialog content before native outside interaction")
  const nativeDialogTrigger = document.body.querySelectorAll('[aria-haspopup="dialog"]')[0]
  if (!(nativeDialogTrigger instanceof HTMLElement)) throw new Error("Expected dialog trigger before native outside interaction")
  const nativePointerTargets: Element[] = []
  const captureNativePointerTarget = (event: Event) => {
    if (event.target instanceof Element) nativePointerTargets.push(event.target)
  }
  document.addEventListener("pointerdown", captureNativePointerTarget, true)
  renderer.clickTestId("dialog-probe-outside")
  document.removeEventListener("pointerdown", captureNativePointerTarget, true)

  const nativePointerTarget = nativePointerTargets[0]
  if (!nativePointerTarget) throw new Error("native outside interaction should dispatch a document pointerdown target")
  requireCondition(
    !nativeDialogContent.contains(nativePointerTarget),
    "native outside coordinates should hit outside Dialog content",
  )
  requireCondition(
    nativePointerTarget !== nativeDialogTrigger,
    "native outside coordinates should not hit the excluded Dialog trigger",
  )
  await settlePresence(renderer)
  requireCondition(renderer.textContent("dialog-probe").includes("About Kobalte"), "native outside interaction should remain open before target replay")

  dispatchPointerDown(nativePointerTarget)
  renderer.flush()
  await settlePresence(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "synthetic replay at native target should dismiss Dialog")

  app.unmount()
  console.log("solid1 dialog-only Kobalte probe: passed")
}
