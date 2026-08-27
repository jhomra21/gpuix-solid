import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { KobalteShowcase } from "./app"
import { SemanticSvgProbe } from "./semantic-svg-probe"

const SCREENSHOT_PATH = "/tmp/gpuix-solid1-kobalte-gallery.png"
const VIEWPORT_WIDTH = 1180
const VIEWPORT_HEIGHT = 820

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
}

function requireValueEnding(app: ReturnType<typeof createTestRoot>, testId: string, suffix: string, label: string): void {
  const value = String(app.renderer.customPropTestId(testId, "value") ?? "")
  if (!value.endsWith(suffix)) throw new Error(`${label}: expected ${JSON.stringify(value)} to end with ${JSON.stringify(suffix)}`)
}

function reveal(app: ReturnType<typeof createTestRoot>, testId: string): void {
  const bounds = app.renderer.boundsTestId(testId)
  const current = app.renderer.scrollOffsetTestId("kobalte-showcase") ?? [0, 0]
  const margin = 12
  let nextY = current[1]
  if (bounds.y < margin) nextY += margin - bounds.y
  else if (bounds.y + bounds.height > VIEWPORT_HEIGHT - margin) {
    nextY -= bounds.y + bounds.height - (VIEWPORT_HEIGHT - margin)
  }
  if (nextY !== current[1]) app.renderer.scrollTestId("kobalte-showcase", current[0], nextY)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Kobalte gallery: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT })
  app.render(() => <KobalteShowcase />)

  requireCondition(app.renderer.hasTestId("kobalte-showcase"), "Kobalte gallery root should render")
  requireCondition(app.renderer.styleTestId("kobalte-showcase").backgroundColor === "#09090b", "gallery should start with the dark palette")
  requireText(app.renderer.textContent("support-summary"), "10 published compatibility areas", "support summary")

  for (const id of ["button", "image", "separator", "text-field", "tooltip", "dialog", "dropdown", "context", "menubar", "color"]) {
    requireCondition(app.renderer.hasTestId(`support-${id}`), `support matrix should include ${id}`)
  }

  requireCondition(app.renderer.hasTestId("button-action"), "Button adapter should render")
  requireCondition(app.renderer.hasTestId("button-disabled"), "disabled Button state should render")
  requireCondition(app.renderer.hasTestId("button-keyboard"), "keyboard Button state should render")
  requireCondition(app.renderer.hasTestId("text-field-input"), "TextField.Input should render")
  requireCondition(app.renderer.hasTestId("text-field-textarea"), "TextField.TextArea should render")
  requireCondition(app.renderer.hasTestId("text-field-error"), "invalid TextField.ErrorMessage should render")
  requireCondition(app.renderer.styleTestId("text-field-disabled").pointerEvents === "none", "disabled TextField should not receive pointer input")
  requireCondition(app.renderer.styleTestId("text-field-disabled").opacity === 0.5, "disabled TextField should expose a disabled visual state")
  requireCondition(app.renderer.hasTestId("avatar-source-img"), "Image.Img should render when a source exists")
  requireCondition(!app.renderer.hasTestId("avatar-source-fallback"), "Image.Fallback should stay hidden when a source exists")
  requireCondition(app.renderer.hasTestId("avatar-fallback-content"), "Image.Fallback should render without a source")
  requireCondition(app.renderer.hasTestId("separator-horizontal"), "horizontal Separator should render")
  requireCondition(app.renderer.hasTestId("separator-vertical"), "vertical Separator should render")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("context-content"), "ContextMenu.Content should start closed")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog.Content should start closed")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar.Content should start closed")
  requireCondition(!app.renderer.hasTestId("tooltip-content"), "Tooltip.Content should start closed")

  app.renderer.captureScreenshot(SCREENSHOT_PATH)

  reveal(app, "button-action")
  app.renderer.clickTestId("button-action")
  requireText(app.renderer.textContent("last-action"), "Button pressed", "Button press")

  app.renderer.clickTestId("button-disabled")
  requireText(app.renderer.textContent("last-action"), "Button pressed", "disabled Button")

  reveal(app, "button-keyboard")
  app.renderer.pressKeyTestId("button-keyboard", "enter")
  requireText(app.renderer.textContent("last-action"), "Keyboard button pressed", "Button Enter activation")
  app.renderer.pressKeyTestId("button-keyboard", "space")
  requireText(app.renderer.textContent("last-action"), "Keyboard button pressed", "Button Space activation")

  reveal(app, "text-field-input")
  app.renderer.typeTestId("text-field-input", " X")
  requireValueEnding(app, "text-field-input", " X", "controlled TextField.Input")
  reveal(app, "text-field-textarea")
  app.renderer.typeTestId("text-field-textarea", "!")
  requireValueEnding(app, "text-field-textarea", "!", "controlled TextField.TextArea")

  reveal(app, "theme-toggle")
  app.renderer.clickTestId("theme-toggle")
  requireText(app.renderer.textContent("theme-toggle"), "Theme: light", "ColorMode toggle")
  requireCondition(app.renderer.styleTestId("kobalte-showcase").backgroundColor === "#f5f5f7", "ColorMode toggle should switch the painted root palette")
  requireCondition(app.renderer.styleTestId("text-field-input").backgroundColor === "#ffffff", "ColorMode toggle should switch controlled input chrome")

  reveal(app, "tooltip-trigger")
  app.renderer.hoverTestId("kobalte-showcase")
  app.renderer.hoverTestId("tooltip-trigger")
  requireCondition(app.renderer.hasTestId("tooltip-content"), "Tooltip should open from native hover")
  app.renderer.pressKeyTestId("tooltip-trigger", "escape")
  requireCondition(!app.renderer.hasTestId("tooltip-content"), "Tooltip should close from Escape")

  reveal(app, "dropdown-trigger")
  app.renderer.clickTestId("dropdown-trigger")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "DropdownMenu.Trigger should open content")
  requireCondition(app.renderer.hasTestId("dropdown-group-label"), "DropdownMenu.GroupLabel should render")
  requireCondition(app.renderer.hasTestId("dropdown-checkbox-indicator"), "checked DropdownMenu.CheckboxItem should render its indicator")

  app.renderer.clickTestId("dropdown-disabled")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "disabled DropdownMenu.Item should not close the menu")
  requireText(app.renderer.textContent("last-action"), "Keyboard button pressed", "disabled DropdownMenu.Item")

  app.renderer.clickTestId("dropdown-checkbox")
  requireCondition(!app.renderer.hasTestId("dropdown-checkbox-indicator"), "DropdownMenu.CheckboxItem should toggle without closing the menu")
  requireCondition(app.renderer.hasTestId("dropdown-content"), "checkbox selection should keep the root menu open")
  requireCondition(app.renderer.hasTestId("radio-beats-indicator"), "initial radio value should render its indicator")
  app.renderer.clickTestId("radio-time")
  requireCondition(app.renderer.hasTestId("radio-time-indicator"), "DropdownMenu.RadioItem should update the selected indicator")
  requireCondition(!app.renderer.hasTestId("radio-beats-indicator"), "previous radio indicator should clear")
  app.renderer.hoverTestId("dropdown-sub-trigger")
  requireCondition(app.renderer.hasTestId("dropdown-sub-content"), "DropdownMenu.Sub should open from hover")
  app.renderer.clickTestId("dropdown-sub-master")
  requireText(app.renderer.textContent("last-action"), "Master routing", "Dropdown submenu selection")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "submenu item should close the root menu")

  reveal(app, "dropdown-trigger")
  app.renderer.clickTestId("dropdown-trigger")
  app.renderer.clickTestId("dropdown-item")
  requireText(app.renderer.textContent("last-action"), "Insert audio track", "Dropdown item selection")
  requireCondition(!app.renderer.hasTestId("dropdown-content"), "Dropdown item should close root menu")

  reveal(app, "context-trigger")
  app.renderer.clickTestId("context-trigger")
  requireCondition(!app.renderer.hasTestId("context-content"), "ContextMenu must ignore a normal left click")
  app.renderer.rightClickTestId("context-trigger")
  requireCondition(app.renderer.hasTestId("context-content"), "ContextMenu must open from a native right click")
  requireCondition(app.renderer.hasTestId("context-group-label"), "ContextMenu.GroupLabel should render")

  app.renderer.clickTestId("context-disabled")
  requireCondition(app.renderer.hasTestId("context-content"), "disabled ContextMenu.Item should not close the menu")
  requireText(app.renderer.textContent("last-action"), "Insert audio track", "disabled ContextMenu.Item")

  app.renderer.hoverTestId("context-sub-trigger")
  requireCondition(app.renderer.hasTestId("context-sub-content"), "ContextMenu.Sub should open from hover")
  app.renderer.clickTestId("context-sub-blue")
  requireText(app.renderer.textContent("last-action"), "Blue clip", "Context submenu selection")
  requireCondition(!app.renderer.hasTestId("context-content"), "Context submenu item should close content")

  reveal(app, "context-trigger")
  app.renderer.rightClickTestId("context-trigger")
  app.renderer.clickTestId("context-duplicate")
  requireText(app.renderer.textContent("last-action"), "Duplicate clip", "Context menu selection")
  requireCondition(!app.renderer.hasTestId("context-content"), "Context menu item should close content")

  reveal(app, "menubar-file")
  app.renderer.clickTestId("menubar-file")
  requireCondition(app.renderer.hasTestId("menubar-file-content"), "Menubar trigger should open its menu")
  app.renderer.clickTestId("menubar-disabled")
  requireCondition(app.renderer.hasTestId("menubar-file-content"), "disabled Menubar.Item should not close the menu")
  requireText(app.renderer.textContent("last-action"), "Duplicate clip", "disabled Menubar.Item")
  app.renderer.hoverTestId("menubar-export")
  requireCondition(app.renderer.hasTestId("menubar-export-content"), "Menubar submenu should open from hover")
  app.renderer.clickTestId("menubar-export-wav")
  requireText(app.renderer.textContent("last-action"), "Export WAV", "Menubar submenu selection")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar submenu selection should close the menu")

  reveal(app, "menubar-file")
  app.renderer.clickTestId("menubar-file")
  app.renderer.clickTestId("menubar-new")
  requireText(app.renderer.textContent("last-action"), "New project", "Menubar selection")
  requireCondition(!app.renderer.hasTestId("menubar-file-content"), "Menubar item should close menu")

  reveal(app, "dialog-trigger")
  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-overlay"), "Dialog overlay should mount")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog content should mount")
  requireCondition(app.renderer.hasTestId("dialog-title"), "Dialog.Title should render")
  requireCondition(app.renderer.hasTestId("dialog-description"), "Dialog.Description should render")
  app.renderer.clickTestId("dialog-overlay")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog overlay should dismiss content")

  reveal(app, "dialog-trigger")
  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog should reopen")
  app.renderer.pressKeyTestId("dialog-content", "escape")
  requireCondition(!app.renderer.hasTestId("dialog-content"), "Dialog should close from Escape")

  reveal(app, "dialog-trigger")
  app.renderer.clickTestId("dialog-trigger")
  requireCondition(app.renderer.hasTestId("dialog-content"), "Dialog should reopen after Escape")
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

  console.log("solid1 Kobalte compatibility gallery: passed")
}
