import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { applyDebugFrameOverlay } from "../src/capabilities.js"
import { animate } from "../src/components/animate.js"
import { useGpuixRequired } from "../src/context.js"
import { createHostElement } from "../src/host/nodes.js"
import type { NativeRenderer } from "../src/host/types.js"
import { createComponent } from "../src/host/universal.js"
import { useWindowSize, type WindowSize } from "../src/hooks/use-window-size.js"
import { createRoot } from "../src/root.js"
import { CapabilityRenderer } from "./capability-renderer.js"

describe("native capabilities", () => {
  it("exposes the active renderer to Solid components", () => {
    const renderer = new CapabilityRenderer()
    const root = createRoot(renderer)
    let activeRenderer: NativeRenderer | undefined

    function Probe() {
      activeRenderer = useGpuixRequired()
      return createHostElement("div")
    }

    root.render(() => createComponent(Probe, {}))
    if (!activeRenderer) throw new Error("Expected renderer from GPUIX context")

    activeRenderer.focusElement?.(7)
    activeRenderer.blur?.()
    activeRenderer.scrollTo?.(7, -4, -8)
    activeRenderer.scrollToItem?.(7, 12)
    expect(activeRenderer.getScrollOffset?.(7)).toEqual([-4, -8])
    expect(activeRenderer.getSelectedText?.()).toBe("selected")
    activeRenderer.clearSelection?.()
    activeRenderer.setWindowTitle?.("Solid GPUIX")

    expect(renderer.capabilityCalls).toEqual([
      ["focusElement", 7],
      ["blur"],
      ["scrollTo", 7, -4, -8],
      ["scrollToItem", 7, 12],
      ["getScrollOffset", 7],
      ["getSelectedText"],
      ["clearSelection"],
      ["setWindowTitle", "Solid GPUIX"],
    ])
    expect(renderer.selectedText).toBeNull()
  })

  it("reads the initialized native window size through a reactive Solid value", () => {
    const renderer = new CapabilityRenderer()
    renderer.windowSize = { width: 1280, height: 720 }
    const root = createRoot(renderer)
    let size: WindowSize | undefined

    function Probe() {
      size = useWindowSize()
      return createHostElement("div")
    }

    root.render(() => createComponent(Probe, {}))
    if (!size) throw new Error("Expected window size")

    expect(size.width).toBe(1280)
    expect(size.height).toBe(720)
    expect(renderer.capabilityCalls).toContainEqual(["getWindowSize"])
  })

  it("applies the debug frame overlay through the renderer capability", () => {
    const renderer = new CapabilityRenderer()

    applyDebugFrameOverlay(renderer, "full")
    expect(renderer.debugFrameOverlay).toBe("full")
    expect(renderer.capabilityCalls).toEqual([["setDebugFrameOverlay", "full"]])

    applyDebugFrameOverlay(renderer, undefined)
    expect(renderer.capabilityCalls).toHaveLength(1)
  })

  it("keeps animate.div reactive while sending one private native motion prop", () => {
    const renderer = new CapabilityRenderer()
    const root = createRoot(renderer)
    const [opacity, setOpacity] = createSignal(0)

    function App() {
      return createComponent(animate.div, {
        initial: { opacity: 0 },
        get to() {
          return { opacity: opacity() }
        },
        transition: { duration: 0.2, ease: "easeOut" },
        style: { width: 120, height: 44 },
        children: "animated",
      })
    }

    root.render(() => createComponent(App, {}))
    expect(renderer.batches[0]).toContainEqual([
      "setCustomProp",
      1,
      "motion",
      {
        initial: { opacity: 0 },
        animate: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeOut" },
      },
    ])

    root.flushSync(() => setOpacity(1))
    expect(renderer.batches.at(-1)).toEqual([
      [
        "setCustomProp",
        1,
        "motion",
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, ease: "easeOut" },
        },
      ],
    ])
  })
})