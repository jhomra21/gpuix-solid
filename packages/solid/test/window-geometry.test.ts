import { describe, expect, it } from "vitest"
import { createTextNode } from "../src/host/universal.js"
import { useWindowInsets, useWindowSize } from "../src/hooks/use-window-size.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("window geometry hooks", () => {
  nativeIt("reads the granted native size and zero-inset test fallback", () => {
    const root = createTestRoot(320, 200)
    const granted = root.renderer.getWindowSize()

    root.render(() => {
      const size = useWindowSize({ intervalMs: false })
      const insets = useWindowInsets({ intervalMs: false })
      return createTextNode(
        `${size.width}x${size.height}|${insets.keyboardTop}|${insets.visibleHeight}|${String(insets.keyboardVisible)}|${insets.safeArea.top}`,
      )
    })

    expect(root.renderer.getAllText()).toContain(
      `${granted.width}x${granted.height}|${granted.height}|${granted.height}|false|0`,
    )

    root.unmount()
  })
})
