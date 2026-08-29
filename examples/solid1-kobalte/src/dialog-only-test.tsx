import { configureNativeStyleManifest, createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { layerStack } from "kobalte-layer-stack-probe"
import { nativeKobalteManifest } from "./native-kobalte.generated"
import { BasicExample as DialogExample } from "./upstream/kobalte/examples/dialog"

configureNativeStyleManifest(nativeKobalteManifest)

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
      <div id="dialog-probe-outside" testId="dialog-probe-outside" onClick={() => undefined}>Outside</div>
      <div testId="dialog-probe"><DialogExample /></div>
    </div>
  ))

  renderer.clickTextWithinTestId("dialog-probe", "Open")
  requireText(renderer.textContent("dialog-probe"), "About Kobalte", "fresh Dialog open")
  await settle(renderer)

  const dialogContent = document.body.querySelectorAll('[role="dialog"]')[0]
  if (!(dialogContent instanceof HTMLElement)) throw new Error("Expected HTMLElement-compatible Dialog content")
  const outside = document.body.querySelectorAll('[id="dialog-probe-outside"]')[0]
  if (!(outside instanceof HTMLElement)) throw new Error("Expected HTMLElement-compatible outside target")

  const pointerTargets: Element[] = []
  let outsideCustomEvents = 0
  const captureTarget = (event: Event) => {
    if (pointerTargets.length === 0 && event.target instanceof Element) pointerTargets.push(event.target)
  }
  const captureOutside = () => {
    outsideCustomEvents += 1
  }
  document.addEventListener("pointerdown", captureTarget, true)
  outside.addEventListener("interactOutside.pointerDownOutside", captureOutside)

  renderer.clickTestId("dialog-probe-outside")
  await settle(renderer)
  document.removeEventListener("pointerdown", captureTarget, true)
  outside.removeEventListener("interactOutside.pointerDownOutside", captureOutside)

  if (renderer.textContent("dialog-probe").includes("About Kobalte")) {
    const target = pointerTargets[0]
    const label = target
      ? `${target.localName}#${target.getAttribute("id") ?? ""}[role=${target.getAttribute("role") ?? ""}]`
      : "none"
    throw new Error(
      `first native outside interaction should dismiss a freshly mounted Dialog; firstTarget=${label}; insideDialog=${target ? dialogContent.contains(target) : false}; customEvents=${outsideCustomEvents}; layers=${layerStack.layers.length}; topmost=${layerStack.isTopMostLayer(dialogContent)}; belowBlocker=${layerStack.isBelowPointerBlockingLayer(dialogContent)}`,
    )
  }

  app.unmount()
  console.log("solid1 fresh native Dialog probe: passed")
}
