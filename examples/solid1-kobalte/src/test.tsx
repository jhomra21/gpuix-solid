import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { KobalteShowcase } from "./app"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Kobalte showcase: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => <KobalteShowcase />)

  requireCondition(app.renderer.hasTestId("kobalte-showcase"), "Kobalte showcase root should render")
  requireCondition(app.renderer.hasTestId("button-action"), "Button adapter should render")
  requireCondition(app.renderer.hasTestId("button-disabled"), "disabled Button adapter should render")
  requireCondition(app.renderer.hasTestId("text-field-input"), "TextField.Input should render")
  requireCondition(app.renderer.hasTestId("text-field-error"), "invalid TextField.ErrorMessage should render")
  requireCondition(app.renderer.hasTestId("avatar-fallback-content"), "Image.Fallback should render without a source")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("context-content"), "ContextMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog.Content should start closed")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar.Content should start closed")

  app.renderer.clickTestId("button-action")
  requireText(app.renderer.textContent("last-action"), "Button pressed", "Button press")

  app.renderer.clickTestId("theme-toggle")
  requireText(app.renderer.textContent("theme-toggle"), "Theme: light", "ColorMode toggle")

  app.renderer.clickTestId("dropdown-trigger")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Trigger should open content")
  requireCondition(app.renderer.hasTestId("dropdown-item"), "DropdownMenu.Item should mount inside content")
  app.renderer.clickTestId("dropdown-item")
  requireText(app.renderer.textContent("last-action"), "Insert audio track", "Dropdown item selection")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "Dropdown item should close root menu")

  app.renderer.clickTestId("context-trigger")
  requireCondition(!app.renderer.hasTestId("context-content"), "ContextMenu must ignore a normal left click")
  app.renderer.rightClickTestId("context-trigger")
  requireCondition(app.renderer.hasTestId("context-content"), "ContextMenu must open from a native right click")
  app.renderer.clickTestId("context-duplicate")
  requireText(app.renderer.textContent("last-action"), "Duplicate clip", "Context menu selection")
  requireCondition(!app.renderer.hasTestId("context-content"), "Context menu item should close content")

  app.renderer.clickTestId("menubar-file")
  requireCondition(app.renderer.hasTestId("menubar-file-content"), "Menubar trigger should open its menu")
  app.renderer.clickTestId("menubar-new")
  requireText(app.renderer.textContent("last-action"), "New project", "Menubar selection")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar item should close menu")

  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-overlay"), "Dialog overlay should mount")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog content should mount")
  app.renderer.clickTestId("dialog-close")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog close button should close content")

  requireCondition(app.renderer.hasTestId("tooltip-trigger"), "Tooltip trigger should render for manual hover/focus validation")

  app.unmount()
  console.log("solid1 Kobalte compatibility showcase: passed")
}
