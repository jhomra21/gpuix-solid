import { describe, expect, it } from "vitest"
import { useWindowInsets, useWindowSize } from "../src/hooks/use-window-size.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function WindowGeometryProbe() {
  const size = useWindowSize({ intervalMs: false })
  const insets = useWindowInsets({ intervalMs: false })

  return (
    <text>
      {`${size.width}x${size.height}|${insets.keyboardTop}|${insets.visibleHeight}|${String(insets.keyboardVisible)}|${insets.safeArea.top}`}
    </text>
  )
}

describe("window geometry hooks", () => {
  nativeIt("reads the granted native size and zero-inset test fallback", () => {
    const root = createTestRoot(320, 200)
    const granted = root.renderer.getWindowSize()

    root.render(() => <WindowGeometryProbe />)

    expect(root.renderer.getAllText()).toContain(
      `${granted.width}x${granted.height}|${granted.height}|${granted.height}|false|0`,
    )

    root.unmount()
  })
})
