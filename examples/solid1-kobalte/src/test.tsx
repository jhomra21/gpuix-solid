import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { KobalteShowcase } from "./app"
import { SemanticSvgProbe } from "./semantic-svg-probe"

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
  requireCondition(app.renderer.styleTestId("kobalte-showcase").backgroundColor === "#09090b", "showcase should start with the dark palette")
  requireCondition(app.renderer.hasTestId("button-action"), "Button adapter should render")
  requireCondition(app.renderer.hasTestId("button-disabled"), "disabled Button adapter should render")
  requireCondition(app.renderer.hasTestId("text-field-input"), "TextField.Input should render")
  requireCondition(app.renderer.hasTestId("text-field-error"), "invalid TextField.ErrorMessage should render")
  requireCondition(app.renderer.hasTestId("avatar-jm-content"), "Image.Fallback should render the primary deterministic avatar")
  requireCondition(app.renderer.hasTestId("avatar-fallback-content"), "Image.Fallback should render without a source")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("context-content"), "ContextMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog.Content should start closed")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar.Content should start closed")

  app.renderer.clickTestId("button-action")
  requireText(app.renderer.textContent("last-action"), "Button pressed", "Button press")

  app.renderer.clickTestId("theme-toggle")
  requireText(app.renderer.textContent("theme-toggle"), "Theme: light", "ColorMode toggle")
  requireCondition(app.renderer.styleTestId("kobalte-showcase").backgroundColor === "#f5f5f7", "ColorMode toggle should switch the painted root palette")
  requireCondition(app.renderer.styleTestId("text-field-input").backgroundColor === "#ffffff", "ColorMode toggle should switch controlled input chrome")

  requireCondition(!app.renderer.hasTestId("tooltip-content"), "Tooltip content should start closed")
  app.renderer.hoverTestId("tooltip-trigger")
  requireCondition(app.renderer.hasTestId("tooltip-content"), "Tooltip should open from native hover")

  app.renderer.clickTestId("dropdown-trigger")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Trigger should open content")
  requireCondition(app.renderer.hasTestId("dropdown-checkbox-indicator"), "checked DropdownMenu.CheckboxItem should render its indicator")
  app.renderer.clickTestId("dropdown-checkbox")
  requireCondition(!app.renderer.hasTestId("dropdown-checkbox-indicator"), "DropdownMenu.CheckboxItem should toggle without closing the menu")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "checkbox selection should keep the root menu open")
  requireCondition(app.renderer.hasTestId("radio-beats-indicator"), "initial radio value should render its indicator")
  app.renderer.clickTestId("radio-time")
  requireCondition(app.renderer.hasTestId("radio-time-indicator"), "DropdownMenu.RadioItem should update the selected indicator")
  requireCondition(!app.renderer.hasTestId("radio-beats-indicator"), "previous radio indicator should clear")
  app.renderer.hoverTestId("dropdown-sub-trigger")
  requireCondition(app.renderer.hasTestId("dropdown-sub-content"), "DropdownMenu.Sub should open from hover")

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
  app.renderer.hoverTestId("menubar-export")
  requireCondition(app.renderer.hasTestId("menubar-export-content"), "Menubar submenu should open from hover")
  app.renderer.clickTestId("menubar-new")
  requireText(app.renderer.textContent("last-action"), "New project", "Menubar selection")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar item should close menu")

  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-overlay"), "Dialog overlay should mount")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog content should mount")
  app.renderer.pressKeyTestId("dialog-content", "escape")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog should close from Escape")

  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog should reopen")
  app.renderer.clickTestId("dialog-close")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog close button should close content")

  app.unmount()

  const semantic = createTestRoot()
  semantic.render(() => <SemanticSvgProbe />)
  requireCondition(semantic.renderer.hasTestId("inline-svg"), "inline SVG should materialize as the native svg custom element")
  requireText(semantic.renderer.textContent("semantic-span"), "Semantic span", "semantic span mapping")
  const source = String(semantic.renderer.customPropTestId("inline-svg", "source") ?? "")
  requireCondition(source.includes("M18 6l-12 12"), "inline SVG should serialize path markup into the upstream source prop")
  const src = String(semantic.renderer.customPropTestId("inline-svg", "src") ?? "")
  requireCondition(src.startsWith("data:image/svg+xml,"), "inline SVG should keep the data-URI fallback for published native builds")
  semantic.unmount()

  console.log("solid1 Kobalte compatibility showcase: passed")
}
