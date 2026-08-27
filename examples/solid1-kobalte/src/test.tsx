import { createTestRoot, hasNativeTestRenderer, type TestBounds } from "@jhomra21/gpuix-solid1"
import { KobalteShowcase } from "./app"
import { SemanticSvgProbe } from "./semantic-svg-probe"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
}

function centerX(bounds: TestBounds): number { return bounds.x + bounds.width / 2 }
function centerY(bounds: TestBounds): number { return bounds.y + bounds.height / 2 }
function closeEnough(a: number, b: number, tolerance = 2): boolean { return Math.abs(a - b) <= tolerance }

if (!hasNativeTestRenderer) {
  console.log("solid1 Kobalte showcase: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const r = app.renderer
  app.render(() => <KobalteShowcase />)

  requireCondition(r.hasTestId("kobalte-showcase"), "Kobalte showcase root should render")
  requireCondition(r.styleTestId("kobalte-showcase").backgroundColor === "#18181b", "showcase should start with the Kobalte dark example palette")
  requireCondition(r.hasTestId("button-action"), "Button adapter should render")
  requireCondition(r.styleTestId("button-action").height === 40, "Button should match the Kobalte BasicExample 40px height")
  requireCondition(r.styleTestId("button-action").borderRadius === 6, "Button should match the Kobalte BasicExample 6px radius")
  requireCondition(r.styleTestId("button-action").backgroundColor === "#0369a0", "dark Button should match the Kobalte example blue")
  requireCondition(r.hasTestId("button-disabled"), "disabled Button adapter should remain covered without adding fixture chrome")
  requireCondition(r.styleTestId("text-field-input").width === 200, "TextField should match the Kobalte example width")
  requireCondition(r.hasTestId("text-field-error"), "invalid TextField.ErrorMessage should render")
  requireCondition(r.styleTestId("avatar-jm").width === 56 && r.styleTestId("avatar-jm").height === 56, "Image should match the Kobalte BasicExample 56px size")
  requireCondition(r.styleTestId("avatar-jm-content").borderRadius === 28, "Image fallback itself should be clipped to the Kobalte circle")
  requireCondition(r.hasTestId("avatar-fallback-content"), "Image.Fallback should render without a source")
  requireCondition(r.styleTestId("context-trigger").width === 300, "ContextMenu target should match the Kobalte example width")
  requireCondition(r.styleTestId("context-trigger").position === "relative", "ContextMenu target should own its native dashed-frame segments")
  requireCondition(r.hasTestId("context-dash-top-0"), "ContextMenu target should emulate Kobalte's dashed border")
  requireCondition(r.hasTestId("menubar-middle-file"), "Menubar should include the real Git, File, Edit composition")

  const tooltipTrigger = r.boundsTestId("tooltip-trigger")
  const dropdownTrigger = r.boundsTestId("dropdown-trigger")
  const dialogTrigger = r.boundsTestId("dialog-trigger")
  requireCondition(tooltipTrigger.width < 160, `Tooltip trigger should stay intrinsic; got ${tooltipTrigger.width}px`)
  requireCondition(dropdownTrigger.width < 190, `DropdownMenu trigger should stay intrinsic; got ${dropdownTrigger.width}px`)
  requireCondition(dialogTrigger.width < 120, `Dialog trigger should stay intrinsic; got ${dialogTrigger.width}px`)

  const context = r.boundsTestId("context-trigger")
  const contextLabel = r.boundsTestId("context-trigger-label")
  requireCondition(closeEnough(centerX(context), centerX(contextLabel)), "ContextMenu label should be horizontally centered")
  requireCondition(closeEnough(centerY(context), centerY(contextLabel)), "ContextMenu label should be vertically centered")

  requireCondition(!r.hasTestId("tooltip-content"), "Tooltip should start closed")
  requireCondition(!r.hasTestId("dropdown-content"), "DropdownMenu should start closed")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu should start closed")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog should start closed")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar should start closed")

  r.clickTestId("button-action")
  requireText(r.textContent("last-action"), "Button pressed", "Button press")

  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: light", "ColorMode toggle")
  requireCondition(r.styleTestId("kobalte-showcase").backgroundColor === "#ffffff", "ColorMode should switch the canvas to light")
  requireCondition(r.styleTestId("button-action").backgroundColor === "#0284c5", "light Button should match Kobalte blue")
  requireCondition(r.styleTestId("text-field-input").backgroundColor === "#ffffff", "ColorMode should switch input chrome")

  r.hoverTestId("tooltip-trigger")
  requireCondition(r.hasTestId("tooltip-content"), "Tooltip should open from native hover")
  requireCondition(r.styleTestId("tooltip-content").borderRadius === 6, "Tooltip should match the Kobalte radius")
  const openTooltipTrigger = r.boundsTestId("tooltip-trigger")
  const tooltipContent = r.boundsTestId("tooltip-content")
  requireCondition(closeEnough(centerX(openTooltipTrigger), centerX(tooltipContent), 3), `Tooltip should center over its trigger; centers differ by ${Math.abs(centerX(openTooltipTrigger) - centerX(tooltipContent))}px`)

  r.clickTestId("dropdown-trigger")
  requireCondition(r.hasTestId("dropdown-content"), "DropdownMenu.Trigger should open content")
  requireCondition(r.styleTestId("dropdown-content").minWidth === 220, "DropdownMenu should match Kobalte's 220px minimum width")
  requireCondition(r.styleTestId("dropdown-content").padding === 8, "DropdownMenu should match Kobalte's 8px padding")
  requireCondition(r.hasTestId("dropdown-checkbox-indicator"), "checked DropdownMenu.CheckboxItem should render its indicator")
  r.clickTestId("dropdown-checkbox")
  requireCondition(!r.hasTestId("dropdown-checkbox-indicator") && r.hasTestId("dropdown-content"), "Dropdown checkbox should toggle without closing")
  requireCondition(r.hasTestId("radio-beats-indicator"), "initial radio value should render its indicator")
  r.clickTestId("radio-time")
  requireCondition(r.hasTestId("radio-time-indicator") && !r.hasTestId("radio-beats-indicator"), "Dropdown radio selection should update")
  r.hoverTestId("dropdown-sub-trigger")
  requireCondition(r.hasTestId("dropdown-sub-content"), "Dropdown submenu should open from hover")
  r.clickTestId("dropdown-item")
  requireText(r.textContent("last-action"), "Commit", "Dropdown selection")
  requireCondition(!r.hasTestId("dropdown-content"), "Dropdown item should close the menu")

  r.clickTestId("context-trigger")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu must ignore a normal left click")
  r.rightClickTestId("context-trigger")
  requireCondition(r.hasTestId("context-content"), "ContextMenu must open from right click")
  r.clickTestId("context-duplicate")
  requireText(r.textContent("last-action"), "Commit", "Context menu selection")
  requireCondition(!r.hasTestId("context-content"), "Context item should close the menu")

  r.clickTestId("menubar-file")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar trigger should open its menu")
  requireCondition(r.styleTestId("menubar-file-content").minWidth === 220, "Menubar should match Kobalte menu width")
  r.hoverTestId("menubar-export")
  requireCondition(r.hasTestId("menubar-export-content"), "Menubar submenu should open from hover")
  r.clickTestId("menubar-new")
  requireText(r.textContent("last-action"), "Commit", "Menubar selection")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar item should close the menu")

  r.clickTestId("dialog-trigger")
  requireCondition(r.hasTestId("dialog-overlay") && r.hasTestId("dialog-content"), "Dialog portal should mount overlay and content")
  const overlayStyle = r.styleTestId("dialog-overlay")
  requireCondition(overlayStyle.top === 0 && overlayStyle.right === 0 && overlayStyle.bottom === 0 && overlayStyle.left === 0, "Dialog overlay should fill its window portal positioner")
  requireCondition(overlayStyle.backgroundColor === "rgba(0, 0, 0, 0.2)", "Dialog overlay should match Kobalte's 20% black backdrop")
  requireCondition(r.styleTestId("dialog-content").width === 500, "Dialog should match Kobalte's 500px content width")
  requireCondition(r.styleTestId("dialog-content").borderRadius === 6, "Dialog should match Kobalte's radius")
  r.pressKeyTestId("dialog-content", "escape")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog should close from Escape")
  r.clickTestId("dialog-trigger")
  requireCondition(r.hasTestId("dialog-content"), "Dialog should reopen")
  r.clickTestId("dialog-close")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog close button should close content")

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
