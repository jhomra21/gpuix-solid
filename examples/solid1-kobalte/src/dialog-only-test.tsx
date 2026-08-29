import { configureNativeStyleManifest, createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { layerStack } from "kobalte-layer-stack-probe"
import { nativeKobalteManifest } from "./native-kobalte.generated"
import { BasicExample as DialogExample } from "./upstream/kobalte/examples/dialog"

configureNativeStyleManifest(nativeKobalteManifest)

const OUTSIDE_EVENT = "interactOutside.pointerDownOutside"

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
  const trigger = document.body.querySelectorAll('[aria-haspopup="dialog"]')[0]
  if (!(trigger instanceof HTMLElement)) throw new Error("Expected HTMLElement-compatible Dialog trigger")

  const pointerTargets: Element[] = []
  let outsideCustomEvents = 0
  let kobalteCustomListenerAdds = 0
  let kobalteCustomDispatches = 0
  const captureTarget = (event: Event) => {
    if (pointerTargets.length === 0 && event.target instanceof Element) pointerTargets.push(event.target)
  }
  const captureOutside = () => {
    outsideCustomEvents += 1
  }
  document.addEventListener("pointerdown", captureTarget, true)
  outside.addEventListener(OUTSIDE_EVENT, captureOutside)

  const originalOutsideAdd = outside.addEventListener.bind(outside)
  const originalOutsideDispatch = outside.dispatchEvent.bind(outside)
  Object.defineProperties(outside, {
    addEventListener: {
      configurable: true,
      value: (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (type === OUTSIDE_EVENT) kobalteCustomListenerAdds += 1
        if (listener) originalOutsideAdd(type, listener, options)
      },
    },
    dispatchEvent: {
      configurable: true,
      value: (event: Event) => {
        if (event.type === OUTSIDE_EVENT) kobalteCustomDispatches += 1
        return originalOutsideDispatch(event)
      },
    },
  })

  renderer.clickTestId("dialog-probe-outside")
  await settle(renderer)
  document.removeEventListener("pointerdown", captureTarget, true)
  outside.removeEventListener(OUTSIDE_EVENT, captureOutside)

  if (renderer.textContent("dialog-probe").includes("About Kobalte")) {
    const target = pointerTargets[0]
    const label = target
      ? `${target.localName}#${target.getAttribute("id") ?? ""}[role=${target.getAttribute("role") ?? ""}]`
      : "none"
    const documentContains = target ? document.contains(target) : false
    const topLayerAncestor = target ? target.closest("[data-kb-top-layer]") : null
    const sameOutside = target === outside
    const sameDocument = target?.ownerDocument === document
    const triggerContains = target ? trigger.contains(target) : false
    throw new Error(
      `first native outside interaction should dismiss a freshly mounted Dialog; firstTarget=${label}; sameOutside=${sameOutside}; sameDocument=${sameDocument}; documentContains=${documentContains}; topLayerAncestor=${topLayerAncestor !== null}; insideDialog=${target ? dialogContent.contains(target) : false}; triggerContains=${triggerContains}; customListenerAdds=${kobalteCustomListenerAdds}; customDispatches=${kobalteCustomDispatches}; customEvents=${outsideCustomEvents}; layers=${layerStack.layers.length}; topmost=${layerStack.isTopMostLayer(dialogContent)}; belowBlocker=${layerStack.isBelowPointerBlockingLayer(dialogContent)}`,
    )
  }

  app.unmount()
  console.log("solid1 fresh native Dialog probe: passed")
}
