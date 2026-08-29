import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { UpstreamKobalteShowcase } from "./upstream-app"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function settleEffects(flush: () => void): Promise<void> {
  await wait(0)
  await wait(0)
  flush()
}

if (!hasNativeTestRenderer) {
  console.log("solid1 upstream Kobalte fixture: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const r = app.renderer
  app.render(() => <UpstreamKobalteShowcase />)

  for (const testId of [
    "upstream-menubar",
    "upstream-button",
    "upstream-text-field",
    "upstream-image",
    "upstream-tooltip",
    "upstream-separator",
    "upstream-dropdown",
    "upstream-context",
    "upstream-dialog",
  ]) requireCondition(r.hasTestId(testId), `${testId} should render from upstream source`)

  requireText(r.textContent("upstream-button"), "Click me", "upstream Button source")
  requireText(r.textContent("upstream-tooltip"), "Trigger", "upstream Tooltip source")
  requireText(r.textContent("upstream-dropdown"), "Git Settings", "upstream DropdownMenu source")
  requireText(r.textContent("upstream-context"), "Right click here.", "upstream ContextMenu source")
  requireText(r.textContent("upstream-dialog"), "Open", "upstream Dialog source")
  requireText(r.textContent("upstream-menubar"), "Git", "upstream Menubar source")

  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: light", "light color mode")

  const lightButtonStyle = r.styleTextWithinTestId("upstream-button", "Click me")
  const lightButtonBounds = r.boundsTextWithinTestId("upstream-button", "Click me")
  requireCondition(lightButtonStyle.backgroundColor === "#0284c5", `light Button should use Kobalte blue, got ${String(lightButtonStyle.backgroundColor)}`)
  requireCondition(lightButtonBounds.height === 40, `light Button should be 40px high, got ${lightButtonBounds.height}`)

  const lightMenubarStyle = r.styleTextWithinTestId("upstream-menubar", "Git")
  const lightMenubarBounds = r.boundsTextWithinTestId("upstream-menubar", "Git")
  requireCondition(lightMenubarStyle.backgroundColor === "#f6f6f7", `light Menubar trigger should use Kobalte surface, got ${String(lightMenubarStyle.backgroundColor)}`)
  requireCondition(lightMenubarBounds.height === 40, `light Menubar trigger should be 40px high, got ${lightMenubarBounds.height}`)

  const contextStyle = r.styleTextWithinTestId("upstream-context", "Right click here.")
  const contextBounds = r.boundsTextWithinTestId("upstream-context", "Right click here.")
  const contextBorderWidth = contextStyle.borderWidth ?? 0
  const contextBorderBoxWidth = contextBounds.width + contextBorderWidth * 2
  requireCondition(contextBorderWidth === 2, `ContextMenu target should have a 2px border, got ${String(contextStyle.borderWidth)}`)
  requireCondition(contextStyle.borderColor === "#71717a", `ContextMenu target should use Kobalte border color, got ${String(contextStyle.borderColor)}`)
  requireCondition(contextBorderBoxWidth === 300, `ContextMenu target should be 300px wide, got ${contextBorderBoxWidth}`)

  const separatorLayoutStyle = r.styleParentOfTextWithinTestId("upstream-separator", "Content above")
  requireCondition(
    separatorLayoutStyle.display === "flex" && separatorLayoutStyle.flexDirection === "column" && separatorLayoutStyle.gap === 8,
    `Separator wrapper should preserve upstream flex column style, got ${JSON.stringify(separatorLayoutStyle)}`,
  )
  const separatorAbove = r.boundsTextWithinTestId("upstream-separator", "Content above")
  const separatorBelow = r.boundsTextWithinTestId("upstream-separator", "Content below")
  requireCondition(separatorBelow.y > separatorAbove.y, `Separator example should stack vertically: above y=${separatorAbove.y}, below y=${separatorBelow.y}`)

  r.captureScreenshot("/tmp/gpuix-solid1-kobalte-light.png")

  r.clickTextWithinTestId("upstream-menubar", "Git")
  requireText(r.textContent("upstream-menubar"), "Commit", "light Menubar Git menu")
  await wait(200)
  app.root.flush()
  r.flush()
  const popperPositionerTestId = "__gpuix-kobalte-popper-positioner"
  console.log(
    `[gpuix-solid1:popper-diagnostic] present=${String(r.hasTestId(popperPositionerTestId))}`,
    r.hasTestId(popperPositionerTestId)
      ? `position=${JSON.stringify(r.customPropTestId(popperPositionerTestId, "position"))} bounds=${JSON.stringify(r.boundsTestId(popperPositionerTestId))}`
      : "",
  )
  r.captureScreenshot("/tmp/gpuix-solid1-kobalte-light-menubar.png")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.rightClickTextWithinTestId("upstream-context", "Right click here.")
  requireText(r.textContent("upstream-context"), "Commit", "light ContextMenu")
  r.captureScreenshot("/tmp/gpuix-solid1-kobalte-light-context.png")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-dialog", "Open")
  requireText(r.textContent("upstream-dialog"), "About Kobalte", "light Dialog open")
  r.captureScreenshot("/tmp/gpuix-solid1-kobalte-light-dialog.png")
  await settleEffects(() => r.flush())
  r.clickTestId("upstream-button")
  await settleEffects(() => r.flush())
  requireCondition(!r.textContent("upstream-dialog").includes("About Kobalte"), "native Dialog overlay should dismiss outside interaction")

  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: dark", "dark color mode")
  const darkButtonStyle = r.styleTextWithinTestId("upstream-button", "Click me")
  const darkMenubarStyle = r.styleTextWithinTestId("upstream-menubar", "Git")
  requireCondition(darkButtonStyle.backgroundColor === "#0369a0", `dark Button should use Kobalte blue, got ${String(darkButtonStyle.backgroundColor)}`)
  requireCondition(darkMenubarStyle.backgroundColor === "#27272a", `dark Menubar trigger should use Kobalte surface, got ${String(darkMenubarStyle.backgroundColor)}`)
  r.captureScreenshot("/tmp/gpuix-solid1-kobalte-dark.png")

  r.typeFirstInputWithinTestId("upstream-text-field", "x")

  r.hoverTextWithinTestId("upstream-tooltip", "Trigger")
  await wait(800)
  r.flush()
  requireText(r.textContent("upstream-tooltip"), "Tooltip content", "Tooltip hover")
  r.hoverTextWithinTestId("upstream-button", "Click me")
  await wait(350)
  r.flush()

  r.clickTextWithinTestId("upstream-dropdown", "Git Settings")
  requireText(r.textContent("upstream-dropdown"), "Commit", "Dropdown pointer open")
  r.clickTextWithinTestId("upstream-dropdown", "Show Git Log")
  requireText(r.textContent("upstream-dropdown"), "Commit", "Dropdown checkbox keeps menu open")
  r.hoverTextWithinTestId("upstream-dropdown", "GitHub")
  await wait(150)
  app.root.flush()
  r.flush()
  requireText(r.textContent("upstream-dropdown"), "Create Pull Request…", "Dropdown submenu hover")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-context", "Right click here.")
  requireCondition(!r.textContent("upstream-context").includes("Commit"), "ContextMenu should ignore left click")
  r.rightClickTextWithinTestId("upstream-context", "Right click here.")
  requireText(r.textContent("upstream-context"), "Commit", "ContextMenu right click")
  r.clickTextWithinTestId("upstream-context", "Show Git Log")
  requireText(r.textContent("upstream-context"), "Commit", "ContextMenu checkbox keeps menu open")
  r.hoverTextWithinTestId("upstream-context", "GitHub")
  await wait(150)
  app.root.flush()
  r.flush()
  requireText(r.textContent("upstream-context"), "Create Pull Request…", "ContextMenu submenu hover")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-menubar", "Git")
  requireText(r.textContent("upstream-menubar"), "Commit", "Menubar Git menu")
  r.clickTextWithinTestId("upstream-menubar", "File")
  requireText(r.textContent("upstream-menubar"), "New Tab", "Menubar File menu")
  r.clickTextWithinTestId("upstream-menubar", "Edit")
  requireText(r.textContent("upstream-menubar"), "Undo", "Menubar Edit menu")
  r.clickTextWithinTestId("upstream-button", "Click me")

  app.unmount()
  console.log("solid1 verbatim upstream Kobalte fixture: passed")
}