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

  // These interactions operate on the verbatim Kobalte docs examples. Only
  // the surrounding fixture and module-resolution bridge are ours.
  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: light", "light color mode")
  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: dark", "dark color mode")

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
  r.clickTextWithinTestId("upstream-dropdown", "GitHub")
  requireText(r.textContent("upstream-dropdown"), "Create Pull Request…", "Dropdown submenu")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-context", "Right click here.")
  requireCondition(!r.textContent("upstream-context").includes("Back"), "ContextMenu should ignore left click")
  r.rightClickTextWithinTestId("upstream-context", "Right click here.")
  requireText(r.textContent("upstream-context"), "Back", "ContextMenu right click")
  r.clickTextWithinTestId("upstream-context", "Show Bookmarks")
  requireText(r.textContent("upstream-context"), "Back", "ContextMenu checkbox keeps menu open")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-menubar", "Git")
  requireText(r.textContent("upstream-menubar"), "Commit", "Menubar Git menu")
  r.clickTextWithinTestId("upstream-menubar", "File")
  requireText(r.textContent("upstream-menubar"), "New Tab", "Menubar File menu")
  r.clickTextWithinTestId("upstream-menubar", "Edit")
  requireText(r.textContent("upstream-menubar"), "Undo", "Menubar Edit menu")
  r.clickTextWithinTestId("upstream-button", "Click me")

  r.clickTextWithinTestId("upstream-dialog", "Open")
  requireText(r.textContent("upstream-dialog"), "About Kobalte", "Dialog open")
  r.clickTestId("theme-toggle")
  requireCondition(!r.textContent("upstream-dialog").includes("About Kobalte"), "Dialog overlay should dismiss outside interaction")

  app.unmount()
  console.log("solid1 verbatim upstream Kobalte fixture: passed")
}
