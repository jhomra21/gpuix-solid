import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { UpstreamKobalteShowcase } from "./upstream-app"

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function opensDropdown(
  click: () => void,
  textContentRoot: () => string,
  flush: () => void,
): Promise<boolean> {
  click()
  for (let attempt = 0; attempt < 30; attempt += 1) {
    flush()
    if (textContentRoot().includes("Commit")) return true
    await wait(10)
  }
  return false
}

if (!hasNativeTestRenderer) {
  console.log("solid1 upstream Kobalte dropdown probe: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const r = app.renderer
  const flushNative = (): void => {
    app.root.flush()
    r.flush()
  }

  app.render(() => <div testId="kobalte-fixture-root"><UpstreamKobalteShowcase /></div>)
  r.clickTestId("theme-toggle")

  const containerBounds = r.boundsTestId("upstream-dropdown")
  const textBounds = r.boundsTextWithinTestId("upstream-dropdown", "Git Settings")
  const triggerStyle = r.styleParentOfTextWithinTestId("upstream-dropdown", "Git Settings")
  console.log(`[kobalte-dropdown-probe] geometry ${JSON.stringify({ containerBounds, textBounds, triggerStyle })}`)

  const containerOpened = await opensDropdown(
    () => r.clickTestId("upstream-dropdown"),
    () => r.textContentRoot(),
    flushNative,
  )
  console.log(`[kobalte-dropdown-probe] container-inset-opened=${containerOpened}`)

  if (containerOpened) {
    r.clickTextWithinTestId("upstream-button", "Click me")
    await wait(20)
    flushNative()
  }

  const textOpened = await opensDropdown(
    () => r.clickTextWithinTestId("upstream-dropdown", "Git Settings"),
    () => r.textContentRoot(),
    flushNative,
  )
  console.log(`[kobalte-dropdown-probe] text-inset-opened=${textOpened}`)

  app.unmount()

  if (!containerOpened || !textOpened) {
    throw new Error(
      `Stable DropdownMenu hit probe failed: container-inset=${containerOpened}, text-inset=${textOpened}`,
    )
  }
  console.log("solid1 upstream Kobalte dropdown probe: passed")
}
