import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type StyleDesc,
} from "gpuix-solid"
import { CodeImageNativeDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-codeimage-native.png"

async function requireTestId(app: App, testId: string): Promise<void> {
  assert.equal(
    await app.getByTestId(testId).count(),
    1,
    `expected ${testId} to exist exactly once`,
  )
}

function borderBoxWidth(boundsWidth: number, style: StyleDesc): number {
  return boundsWidth
    + (style.borderLeftWidth ?? style.borderWidth ?? 0)
    + (style.borderRightWidth ?? style.borderWidth ?? 0)
}

async function scrollIntoView(
  app: App,
  viewportTestId: string,
  targetTestId: string,
): Promise<void> {
  const viewport = app.getByTestId(viewportTestId)
  const target = app.getByTestId(targetTestId)
  const viewportBounds = await viewport.bounds()
  const viewportBottom = viewportBounds.y + viewportBounds.height

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const targetBounds = await target.bounds()
    if (
      targetBounds.y >= viewportBounds.y &&
      targetBounds.y + targetBounds.height <= viewportBottom
    ) {
      return
    }
    await viewport.wheel(0, targetBounds.y >= viewportBottom ? 180 : -180)
  }

  throw new Error(`Could not scroll ${targetTestId} into ${viewportTestId}`)
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("codeimage integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const testRoot = createTestRoot(1280, 820)
  testRoot.renderer.clockPause()
  testRoot.render(() => <CodeImageNativeDemo />)
  const app = createTestApp(testRoot.renderer)

  try {
    await requireTestId(app, "codeimage-shell")
    await requireTestId(app, "codeimage-toolbar")
    await requireTestId(app, "editor-left-sidebar")
    await requireTestId(app, "codeimage-canvas")
    await requireTestId(app, "theme-sidebar")
    await requireTestId(app, "theme-switcher")
    await requireTestId(app, "frame-toolbar")
    await requireTestId(app, "codeimage-footer")

    const toolbar = await app.getByTestId("codeimage-toolbar").bounds()
    const left = await app.getByTestId("editor-left-sidebar").bounds()
    const right = await app.getByTestId("theme-sidebar").bounds()
    const leftStyle = testRoot.renderer.styleTestId("editor-left-sidebar")
    const rightStyle = testRoot.renderer.styleTestId("theme-sidebar")
    const leftOuterWidth = borderBoxWidth(left.width, leftStyle)
    const rightOuterWidth = borderBoxWidth(right.width, rightStyle)
    assert.ok(Math.abs(toolbar.height - 52) <= 1, `expected source 52px toolbar, got ${toolbar.height}`)
    assert.ok(Math.abs(leftOuterWidth - 280) <= 1, `expected source 280px editor sidebar border box, got ${leftOuterWidth}`)
    assert.ok(Math.abs(rightOuterWidth - 280) <= 1, `expected source 280px theme sidebar border box, got ${rightOuterWidth}`)

    await requireTestId(app, "toolbar-settings")
    await requireTestId(app, "codeimage-logo")
    await requireTestId(app, "dashboard-link")
    await requireTestId(app, "share-button")
    await requireTestId(app, "export-button")
    await requireTestId(app, "user-badge")
    await app.getByTestId("toolbar-settings").click()
    await requireTestId(app, "toolbar-menu-content")
    await requireTestId(app, "toolbar-menu-settings")
    await requireTestId(app, "toolbar-menu-changelog")
    await requireTestId(app, "toolbar-menu-github")
    await requireTestId(app, "toolbar-menu-logout")
    await app.getByTestId("toolbar-settings").click()
    assert.equal(await app.getByTestId("toolbar-menu-content").count(), 0)

    assert.equal(await app.getByTestId("frame-padding").textContent(), "64⌄")
    await requireTestId(app, "frame-radius-8")
    await requireTestId(app, "terminal-header")
    await requireTestId(app, "terminal-watermark")
    assert.equal(await app.getByTestId("editor-theme").textContent(), "Fleet Dark⌄")
    assert.equal(await app.getByTestId("line-number-1").count(), 0)

    await app.clock.fastForward(300)
    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    const beforePadding = await app.getByTestId("code-window").bounds()
    await app.getByTestId("frame-padding").click()
    assert.equal(await app.getByTestId("frame-padding").textContent(), "128⌄")
    const afterPadding = await app.getByTestId("code-window").bounds()
    assert.ok(afterPadding.width < beforePadding.width)

    await app.getByTestId("terminal-header-no").click()
    assert.equal(await app.getByTestId("terminal-header").count(), 0)
    await app.getByTestId("terminal-header-yes").click()
    await requireTestId(app, "terminal-header")

    await app.getByTestId("terminal-watermark-hide").click()
    assert.equal(await app.getByTestId("terminal-watermark").count(), 0)
    await app.getByTestId("terminal-watermark-show").click()
    await requireTestId(app, "terminal-watermark")

    await app.getByTestId("preset-toggle").click()
    await requireTestId(app, "preset-panel")
    await requireTestId(app, "preset-minimal")
    await requireTestId(app, "preset-fleet")
    await requireTestId(app, "preset-macos")
    await app.getByTestId("preset-close").click()
    assert.equal(await app.getByTestId("preset-panel").count(), 0)

    await scrollIntoView(app, "editor-left-sidebar", "editor-line-numbers-show")
    await app.getByTestId("editor-line-numbers-show").click()
    await requireTestId(app, "line-number-1")
    await requireTestId(app, "editor-line-number-start")
    await scrollIntoView(app, "editor-left-sidebar", "editor-line-number-start")
    await app.getByTestId("editor-line-number-start").click()
    assert.equal(await app.getByTestId("line-number-1").textContent(), "2")

    await scrollIntoView(app, "editor-left-sidebar", "editor-ligatures-no")
    await app.getByTestId("editor-ligatures-no").click()
    await app.getByTestId("editor-font-weight").click()
    assert.equal(await app.getByTestId("editor-font-weight").textContent(), "500⌄")

    assert.equal(await app.getByTestId("theme-fleetDark").count(), 1)
    await app.getByTestId("theme-vsCodeDarkTheme").click()
    assert.equal(await app.getByTestId("editor-theme").textContent(), "VSCode Dark⌄")
    await app.getByTestId("theme-search").fill("Dracula")
    await requireTestId(app, "theme-dracula")
    assert.equal(await app.getByTestId("theme-fleetDark").count(), 0)
    await app.getByTestId("theme-search").fill("")

    await app.getByTestId("randomize-button").click()
    assert.match(await app.getByTestId("codeimage-status").textContent(), /Theme changed to/)

    await app.getByTestId("format-button").click()
    assert.equal(await app.getByTestId("codeimage-status").textContent(), "Formatted locally")
    await app.getByTestId("copy-button").click()
    assert.equal(await app.getByTestId("codeimage-status").textContent(), "Copied preview locally")

    assert.equal(await app.getByTestId("export-count").textContent(), "0")
    await app.getByTestId("export-button").click()
    assert.equal(await app.getByTestId("export-count").textContent(), "1")
    assert.equal(await app.getByTestId("codeimage-status").textContent(), "Exported 1 preview")

    await app.getByTestId("footer-github").click()
    assert.equal(await app.getByTestId("codeimage-status").textContent(), "GitHub selected")

    console.log("codeimage integration: source-owned editor surfaces passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
