import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type TestRenderer,
} from "gpuix-solid"
import { CodeImageNativeDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-codeimage-native.png"
type NativeTree = NonNullable<ReturnType<TestRenderer["toJSON"]>>

async function requireTestId(app: App, testId: string): Promise<void> {
  assert.equal(
    await app.getByTestId(testId).count(),
    1,
    `expected ${testId} to exist exactly once`,
  )
}

function findTreeByTestId(node: NativeTree | null, testId: string): NativeTree | undefined {
  if (!node) return undefined
  if (node.testId === testId) return node
  for (const child of node.children ?? []) {
    const match = findTreeByTestId(child, testId)
    if (match) return match
  }
  return undefined
}

function borderBoxWidth(node: NativeTree, boundsWidth: number): number {
  const style = node.style ?? {}
  return boundsWidth
    + (style.borderLeftWidth ?? style.borderWidth ?? 0)
    + (style.borderRightWidth ?? style.borderWidth ?? 0)
}

async function scrollIntoView(
  app: App,
  renderer: TestRenderer,
  viewportTestId: string,
  targetTestId: string,
): Promise<void> {
  const viewport = app.getByTestId(viewportTestId)
  const target = app.getByTestId(targetTestId)
  const viewportNode = await viewport.element()
  const viewportBounds = await viewport.bounds()
  const viewportOffset = renderer.getScrollOffset(viewportNode.id) ?? [0, 0]
  const viewportLeft = viewportBounds.x - viewportOffset[0]
  const viewportTop = viewportBounds.y - viewportOffset[1]
  const viewportBottom = viewportTop + viewportBounds.height
  const wheelPoint = {
    x: viewportLeft + viewportBounds.width / 2,
    y: viewportTop + viewportBounds.height / 2,
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const targetBounds = await target.bounds()
    if (
      targetBounds.y >= viewportTop &&
      targetBounds.y + targetBounds.height <= viewportBottom
    ) {
      return
    }
    await app.mouse.move(wheelPoint)
    await app.mouse.wheel(wheelPoint, 0, targetBounds.y >= viewportBottom ? -160 : 160)
    await app.clock.fastForward(16)
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
    const tree = testRoot.renderer.toJSON()
    const leftNode = findTreeByTestId(tree, "editor-left-sidebar")
    const rightNode = findTreeByTestId(tree, "theme-sidebar")
    assert.ok(leftNode, "expected editor-left-sidebar in retained tree")
    assert.ok(rightNode, "expected theme-sidebar in retained tree")
    const leftOuterWidth = borderBoxWidth(leftNode, left.width)
    const rightOuterWidth = borderBoxWidth(rightNode, right.width)
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

    await requireTestId(app, "preset-toggle")
    assert.match(await app.getByTestId("preset-toggle").textContent(), /Show your presets/)
    await app.getByTestId("preset-toggle").click()
    await requireTestId(app, "preset-panel")
    await requireTestId(app, "preset-title")
    assert.equal(await app.getByTestId("preset-title").textContent(), "Your presets")
    await requireTestId(app, "preset-add")
    assert.equal(await app.getByTestId("preset-add").textContent(), "Add preset")
    await requireTestId(app, "preset-card-0")
    await requireTestId(app, "preset-card-0-updated")
    assert.match(await app.getByTestId("preset-card-0-updated").textContent(), /^Updated /)
    await requireTestId(app, "preset-card-0-menu")
    await app.getByTestId("preset-card-0-menu").click()
    await requireTestId(app, "preset-card-0-menu-content")
    await requireTestId(app, "preset-action-update")
    await requireTestId(app, "preset-action-rename")
    await requireTestId(app, "preset-action-share")
    await requireTestId(app, "preset-action-delete")
    await requireTestId(app, "preset-card-1-sync")
    assert.match(await app.getByTestId("preset-card-1-sync").textContent(), /Save in your account/)
    await requireTestId(app, "preset-close")
    await app.getByTestId("preset-close").click()
    assert.equal(await app.getByTestId("preset-panel").count(), 0)

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

    await scrollIntoView(app, testRoot.renderer, "editor-left-sidebar", "terminal-watermark-hide")
    await app.getByTestId("terminal-watermark-hide").click()
    assert.equal(await app.getByTestId("terminal-watermark").count(), 0)
    await app.getByTestId("terminal-watermark-show").click()
    await requireTestId(app, "terminal-watermark")

    await scrollIntoView(app, testRoot.renderer, "editor-left-sidebar", "editor-line-numbers-show")
    await app.getByTestId("editor-line-numbers-show").click()
    await requireTestId(app, "line-number-1")
    await requireTestId(app, "editor-line-number-start")
    await scrollIntoView(app, testRoot.renderer, "editor-left-sidebar", "editor-line-number-start")
    await app.getByTestId("editor-line-number-start").click()
    assert.equal(await app.getByTestId("line-number-1").textContent(), "2")

    await scrollIntoView(app, testRoot.renderer, "editor-left-sidebar", "editor-ligatures-no")
    await app.getByTestId("editor-ligatures-no").click()
    await app.getByTestId("editor-font-weight").click()
    assert.equal(await app.getByTestId("editor-font-weight").textContent(), "500⌄")

    assert.equal(await app.getByTestId("theme-fleetDark").count(), 1)
    await requireTestId(app, "theme-selected-fleetDark")
    await app.getByTestId("theme-vsCodeDarkTheme").click()
    assert.equal(await app.getByTestId("editor-theme").textContent(), "VSCode Dark⌄")
    await requireTestId(app, "theme-selected-vsCodeDarkTheme")
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
