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

async function settle(renderer: { flush(): void }): Promise<void> {
  await wait(0)
  renderer.flush()
  await wait(0)
  renderer.flush()
}

function openDialog(renderer: {
  clickTextWithinTestId(testId: string, text: string): void
  textContent(testId: string): string
}): void {
  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "Dialog open")
}

const app = hasNativeTestRenderer ? createTestRoot() : undefined

if (!app) {
  console.log("solid1 dialog-only Kobalte probe: native TestGpuixRenderer unavailable; skipped")
} else {
  const renderer = app.renderer
  app.render(() => (
    <div style={{ width: "100%", height: "100%", padding: 24, gap: 16 }}>
      <div id="dialog-probe-outside" testId="dialog-probe-outside" onClick={() => undefined}>Outside</div>
      <div testId="dialog-probe"><DialogExample /></div>
    </div>
  ))

  openDialog(renderer)
  await settle(renderer)

  const outside = document.body.querySelectorAll('[id="dialog-probe-outside"]')[0]
  if (!(outside instanceof HTMLElement)) throw new Error("Expected dialog-only outside target")

  const initialContent = document.body.querySelectorAll('[role="dialog"]')[0]
  if (!(initialContent instanceof HTMLElement)) throw new Error("Expected initial Dialog content")
  requireCondition(layerStack.layers.length === 1, `fresh Dialog should register one layer, got ${layerStack.layers.length}`)
  requireCondition(layerStack.layers[0]?.node === initialContent, "fresh Dialog layer should reference rendered Dialog content")

  layerStack.layers[0]?.dismiss?.()
  renderer.flush()
  await settle(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "registered dismiss callback should close Dialog")

  openDialog(renderer)
  await settle(renderer)
  dispatchPointerDown(outside)
  renderer.flush()
  await settle(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "browser-like outside pointerdown should close Dialog")

  openDialog(renderer)
  await settle(renderer)

  const dialogContent = document.body.querySelectorAll('[role="dialog"]')[0]
  if (!(dialogContent instanceof HTMLElement)) throw new Error("Expected Dialog content before native interaction")
  const dialogTrigger = document.body.querySelectorAll('[aria-haspopup="dialog"]')[0]
  if (!(dialogTrigger instanceof HTMLElement)) throw new Error("Expected Dialog trigger before native interaction")

  const nativeTargets: Element[] = []
  const captureNativeTarget = (event: Event) => {
    if (event.target instanceof Element) nativeTargets.push(event.target)
  }
  document.addEventListener("pointerdown", captureNativeTarget, true)
  renderer.clickTestId("dialog-probe-outside")
  document.removeEventListener("pointerdown", captureNativeTarget, true)

  const nativeTarget = nativeTargets[0]
  if (!nativeTarget) throw new Error("Expected native document pointerdown target")
  requireCondition(!dialogContent.contains(nativeTarget), "native target should be outside Dialog content")
  requireCondition(!dialogTrigger.contains(nativeTarget), "native target should be outside excluded Dialog trigger")
  requireCondition(outside === nativeTarget || outside.contains(nativeTarget), "native target should be inside requested outside test target")
  requireCondition(document.contains(nativeTarget), "native target should remain in active document")
  requireCondition(nativeTarget.closest("[data-kb-top-layer]") === null, "native target should not be in a Kobalte top layer")
  requireCondition(layerStack.layers.length === 1 && layerStack.layers[0]?.node === dialogContent, "native click should leave current Dialog layer mounted")
  await settle(renderer)
  requireCondition(renderer.textContent("dialog-probe").includes("About Kobalte"), "native outside click currently reproduces the open Dialog")

  let closestChecks = 0
  let documentContainsChecks = 0
  let contentContainsChecks = 0
  let triggerContainsChecks = 0
  let outsideEvents = 0

  const originalClosest = nativeTarget.closest.bind(nativeTarget)
  const originalDocumentContains = document.contains.bind(document)
  const originalContentContains = dialogContent.contains.bind(dialogContent)
  const originalTriggerContains = dialogTrigger.contains.bind(dialogTrigger)

  Object.defineProperty(nativeTarget, "closest", {
    configurable: true,
    value: (selector: string) => {
      if (selector === "[data-kb-top-layer]") closestChecks += 1
      return originalClosest(selector)
    },
  })
  Object.defineProperty(document, "contains", {
    configurable: true,
    value: (candidate: Node | null) => {
      if (candidate === nativeTarget) documentContainsChecks += 1
      return originalDocumentContains(candidate)
    },
  })
  Object.defineProperty(dialogContent, "contains", {
    configurable: true,
    value: (candidate: Node | null) => {
      if (candidate === nativeTarget) contentContainsChecks += 1
      return originalContentContains(candidate)
    },
  })
  Object.defineProperty(dialogTrigger, "contains", {
    configurable: true,
    value: (candidate: Node | null) => {
      if (candidate === nativeTarget) triggerContainsChecks += 1
      return originalTriggerContains(candidate)
    },
  })

  const observeOutside = () => {
    outsideEvents += 1
  }
  nativeTarget.addEventListener("interactOutside.pointerDownOutside", observeOutside)
  dispatchPointerDown(nativeTarget)
  nativeTarget.removeEventListener("interactOutside.pointerDownOutside", observeOutside)

  Object.defineProperty(nativeTarget, "closest", { configurable: true, value: originalClosest })
  Object.defineProperty(document, "contains", { configurable: true, value: originalDocumentContains })
  Object.defineProperty(dialogContent, "contains", { configurable: true, value: originalContentContains })
  Object.defineProperty(dialogTrigger, "contains", { configurable: true, value: originalTriggerContains })

  requireCondition(closestChecks > 0, "Kobalte replay should inspect the target top-layer guard")
  requireCondition(documentContainsChecks > 0, "Kobalte replay should inspect document containment")
  requireCondition(contentContainsChecks > 0, "Kobalte replay should inspect the current Dialog ref containment")
  requireCondition(triggerContainsChecks > 0, "Kobalte replay should inspect the current trigger exclusion")
  requireCondition(outsideEvents > 0, "all visible outside guards passed but Kobalte emitted no pointerDownOutside event")

  renderer.flush()
  await settle(renderer)
  requireCondition(!renderer.textContent("dialog-probe").includes("About Kobalte"), "guard-traced replay should dismiss Dialog")

  app.unmount()
  console.log("solid1 dialog-only Kobalte probe: passed")
}
