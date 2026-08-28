import { createTestRoot, hasNativeTestRenderer, type TestBounds } from "@jhomra21/gpuix-solid1"
import * as Dialog from "@jhomra21/gpuix-solid1/kobalte/dialog"
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

function ViewportDialogProbe() {
  return (
    <div testId="viewport-probe" style={{ width: 1180, height: 820, backgroundColor: "#18181b" }}>
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Overlay testId="viewport-dialog-overlay" />
          <Dialog.Content testId="viewport-dialog-content"><text>Viewport dialog</text></Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Kobalte showcase: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  const r = app.renderer
  app.render(() => <KobalteShowcase />)

  // Visual contracts for every fixture primitive.
  requireCondition(r.hasTestId("kobalte-showcase"), "Kobalte showcase root should render")
  requireCondition(r.styleTestId("kobalte-showcase").backgroundColor === "#18181b", "showcase should start with the Kobalte dark example palette")
  requireCondition(r.styleTestId("button-action").height === 40, "Button should match the Kobalte BasicExample 40px height")
  requireCondition(r.styleTestId("button-action").borderRadius === 6, "Button should match the Kobalte BasicExample 6px radius")
  requireCondition(r.styleTestId("button-action").backgroundColor === "#0369a0", "dark Button should match the Kobalte example blue")
  requireCondition(r.styleTestId("button-disabled").pointerEvents === "none", "disabled Button should not accept pointer input")
  requireCondition(r.styleTestId("text-field-input").width === 200, "TextField should match the Kobalte example width")
  requireCondition(r.hasTestId("text-field-error"), "invalid TextField.ErrorMessage should render")
  requireCondition(r.styleTestId("avatar-jm").width === 56 && r.styleTestId("avatar-jm").height === 56, "Image should match the Kobalte BasicExample 56px size")
  requireCondition(r.styleTestId("avatar-jm-content").borderRadius === 28, "Image fallback itself should be clipped to the Kobalte circle")
  requireCondition(r.hasTestId("avatar-fallback-content"), "Image.Fallback should render without a source")
  requireCondition(r.styleTestId("context-trigger").width === 300, "ContextMenu target should match the Kobalte example width")
  requireCondition(r.styleTestId("context-trigger").position === "relative", "ContextMenu target should own its native dashed-frame segments")
  requireCondition(r.hasTestId("context-dash-top-0"), "ContextMenu target should emulate Kobalte's dashed border")
  requireCondition(r.hasTestId("menubar-middle-file") && r.hasTestId("menubar-edit"), "Menubar should include the real Git, File, Edit composition")

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

  // Button: keyboard and pointer activation; disabled state stays non-interactive.
  r.pressKeyTestId("button-action", "enter")
  requireText(r.textContent("last-action"), "Button pressed", "Button Enter activation")
  r.clickTestId("menubar-file")
  r.clickTestId("menubar-new")
  requireText(r.textContent("last-action"), "Commit", "Menubar setup action")
  r.pressKeyTestId("button-action", "space")
  requireText(r.textContent("last-action"), "Button pressed", "Button Space activation")
  r.clickTestId("menubar-file")
  r.clickTestId("menubar-new")
  r.clickTestId("button-action")
  requireText(r.textContent("last-action"), "Button pressed", "Button pointer activation")

  // TextField: controlled native input emits the updated complete value.
  r.typeTestId("text-field-input", "x")
  requireCondition(String(r.customPropTestId("text-field-input", "value") ?? "").endsWith("x"), "TextField should update from native typing")
  requireCondition(r.hasTestId("text-field-error"), "invalid TextField should retain its error while the other field edits")

  // ColorMode: both directions update the complete example palette.
  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: light", "ColorMode light toggle")
  requireCondition(r.styleTestId("kobalte-showcase").backgroundColor === "#ffffff", "ColorMode should switch the canvas to light")
  requireCondition(r.styleTestId("button-action").backgroundColor === "#0284c5", "light Button should match Kobalte blue")
  requireCondition(r.styleTestId("text-field-input").backgroundColor === "#ffffff", "ColorMode should switch input chrome")
  r.clickTestId("theme-toggle")
  requireText(r.textContent("theme-toggle"), "Theme: dark", "ColorMode dark toggle")
  requireCondition(r.styleTestId("kobalte-showcase").backgroundColor === "#18181b", "ColorMode should return the canvas to dark")

  // Tooltip: hover, content hover retention, leave, focus, Escape, Enter and Space dismissal.
  r.hoverTestId("tooltip-trigger")
  requireCondition(r.hasTestId("tooltip-content"), "Tooltip should open from native hover")
  requireCondition(r.styleTestId("tooltip-content").borderRadius === 6, "Tooltip should match the Kobalte radius")
  const openTooltipTrigger = r.boundsTestId("tooltip-trigger")
  const tooltipContent = r.boundsTestId("tooltip-content")
  requireCondition(closeEnough(centerX(openTooltipTrigger), centerX(tooltipContent), 3), `Tooltip should center over its trigger; centers differ by ${Math.abs(centerX(openTooltipTrigger) - centerX(tooltipContent))}px`)
  r.hoverTestId("tooltip-content")
  requireCondition(r.hasTestId("tooltip-content"), "Tooltip should remain open while the pointer moves onto content")
  r.hoverTestId("button-action")
  requireCondition(!r.hasTestId("tooltip-content"), "Tooltip should close after pointer leaves trigger and content")
  r.pressKeyTestId("tooltip-trigger", "a")
  requireCondition(r.hasTestId("tooltip-content"), "Tooltip should open immediately from keyboard focus")
  r.pressKey("escape")
  requireCondition(!r.hasTestId("tooltip-content"), "Tooltip should close from Escape")
  r.pressKeyTestId("tooltip-trigger", "enter")
  requireCondition(!r.hasTestId("tooltip-content"), "Tooltip should close from Enter after focus opens it")
  r.pressKeyTestId("tooltip-trigger", "space")
  requireCondition(!r.hasTestId("tooltip-content"), "Tooltip should close from Space after focus opens it")

  // Dropdown Menu: pointer toggle, keyboard open/close, disabled item, checkbox/radio,
  // submenu hover/keyboard, arrow/Home/End focus movement, selection, and outside dismissal.
  r.clickTestId("dropdown-trigger")
  requireCondition(r.hasTestId("dropdown-content"), "DropdownMenu pointer trigger should open content")
  r.clickTestId("dropdown-trigger")
  requireCondition(!r.hasTestId("dropdown-content"), "DropdownMenu pointer trigger should toggle content closed")
  r.pressKeyTestId("dropdown-trigger", "enter")
  requireCondition(r.hasTestId("dropdown-content"), "DropdownMenu should open from Enter")
  r.pressKeyTestId("dropdown-content", "escape")
  requireCondition(!r.hasTestId("dropdown-content"), "DropdownMenu should close from Escape")
  r.pressKeyTestId("dropdown-trigger", "down")
  requireCondition(r.hasTestId("dropdown-content"), "DropdownMenu should open from ArrowDown")
  r.pressKeyTestId("dropdown-content", "escape")
  r.pressKeyTestId("dropdown-trigger", "up")
  requireCondition(r.hasTestId("dropdown-content"), "DropdownMenu should open from ArrowUp")
  r.pressKeyTestId("dropdown-content", "escape")

  r.clickTestId("dropdown-trigger")
  requireCondition(r.styleTestId("dropdown-content").minWidth === 220, "DropdownMenu should match Kobalte's 220px minimum width")
  requireCondition(r.styleTestId("dropdown-content").padding === 8, "DropdownMenu should match Kobalte's 8px padding")
  r.clickTextWithinTestId("dropdown-content", "Update Project")
  requireCondition(r.hasTestId("dropdown-content"), "disabled Dropdown item should not select or close the menu")
  requireCondition(r.hasTestId("dropdown-checkbox-indicator"), "checked DropdownMenu.CheckboxItem should render its indicator")
  r.clickTestId("dropdown-checkbox")
  requireCondition(!r.hasTestId("dropdown-checkbox-indicator") && r.hasTestId("dropdown-content"), "Dropdown checkbox should toggle without closing")
  r.pressKeyTestId("dropdown-checkbox", "space")
  requireCondition(r.hasTestId("dropdown-checkbox-indicator") && r.hasTestId("dropdown-content"), "Dropdown checkbox should toggle from Space without closing")
  requireCondition(r.hasTestId("radio-beats-indicator"), "initial radio value should render its indicator")
  r.clickTestId("radio-time")
  requireCondition(r.hasTestId("radio-time-indicator") && !r.hasTestId("radio-beats-indicator"), "Dropdown radio pointer selection should update")
  r.pressKeyTestId("radio-beats", "enter")
  requireCondition(r.hasTestId("radio-beats-indicator") && !r.hasTestId("radio-time-indicator"), "Dropdown radio keyboard selection should update")
  r.hoverTestId("dropdown-sub-trigger")
  requireCondition(r.hasTestId("dropdown-sub-content"), "Dropdown submenu should open from hover")
  r.pressKeyTestId("dropdown-sub-trigger", "left")
  requireCondition(!r.hasTestId("dropdown-sub-content"), "Dropdown submenu should close from ArrowLeft")
  r.pressKeyTestId("dropdown-sub-trigger", "right")
  requireCondition(r.hasTestId("dropdown-sub-content"), "Dropdown submenu should open from ArrowRight")
  r.pressKeyTestId("dropdown-sub-trigger", "left")

  r.pressKeyTestId("dropdown-item", "down")
  r.pressKey("enter")
  requireText(r.textContent("last-action"), "Push", "Dropdown ArrowDown focus and Enter selection")
  requireCondition(!r.hasTestId("dropdown-content"), "Dropdown selected item should close the menu")
  r.clickTestId("dropdown-trigger")
  r.pressKeyTestId("radio-time", "home")
  r.pressKey("enter")
  requireText(r.textContent("last-action"), "Commit", "Dropdown Home should focus the first item")
  requireCondition(!r.hasTestId("dropdown-content"), "Dropdown Home-selected first item should close")
  r.clickTestId("dropdown-trigger")
  r.pressKeyTestId("dropdown-item", "end")
  r.pressKey("enter")
  requireCondition(r.hasTestId("radio-time-indicator") && r.hasTestId("dropdown-content"), "Dropdown End should focus the last radio item")
  r.clickTestId("button-action")
  requireCondition(!r.hasTestId("dropdown-content"), "Dropdown should close from outside pointer interaction")

  // Context Menu: left click ignored, right click, Escape, keyboard context invocation,
  // disabled item, arrow navigation, selection and outside dismissal.
  r.clickTestId("context-trigger")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu must ignore a normal left click")
  r.rightClickTestId("context-trigger")
  requireCondition(r.hasTestId("context-content"), "ContextMenu must open from right click")
  r.pressKeyTestId("context-content", "escape")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu should close from Escape")
  r.pressKeyTestId("context-trigger", "shift-f10")
  requireCondition(r.hasTestId("context-content"), "ContextMenu should open from Shift+F10")
  r.pressKeyTestId("context-content", "escape")
  r.rightClickTestId("context-trigger")
  r.clickTextWithinTestId("context-content", "Update Project")
  requireCondition(r.hasTestId("context-content"), "disabled ContextMenu item should not close the menu")
  r.pressKeyTestId("context-duplicate", "down")
  r.pressKey("enter")
  requireText(r.textContent("last-action"), "Push", "ContextMenu ArrowDown focus and Enter selection")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu keyboard item selection should close")
  r.rightClickTestId("context-trigger")
  r.clickTestId("button-action")
  requireCondition(!r.hasTestId("context-content"), "ContextMenu should close from outside pointer interaction")

  // Menubar: pointer open/switch, hover switching, Escape, submenu hover/keyboard,
  // Up/Down/Home/End item navigation and Left/Right switching between top-level menus.
  r.clickTestId("menubar-file")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar pointer trigger should open its menu")
  requireCondition(r.styleTestId("menubar-file-content").minWidth === 220, "Menubar should match Kobalte menu width")
  r.hoverTestId("menubar-edit")
  requireCondition(r.hasTestId("menubar-edit-content") && !r.hasTestId("menubar-file-content"), "Menubar hover should switch an already-open menu")
  r.hoverTestId("menubar-file")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar hover should switch back to Git")
  r.pressKeyTestId("menubar-file-content", "escape")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar should close from Escape")
  r.pressKeyTestId("menubar-file", "down")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar should open from ArrowDown")
  r.pressKeyTestId("menubar-file-content", "escape")
  r.pressKeyTestId("menubar-file", "up")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar should open from ArrowUp")
  r.pressKeyTestId("menubar-file-content", "escape")

  r.clickTestId("menubar-file")
  r.hoverTestId("menubar-export")
  requireCondition(r.hasTestId("menubar-export-content"), "Menubar submenu should open from hover")
  r.pressKeyTestId("menubar-export", "left")
  requireCondition(!r.hasTestId("menubar-export-content"), "Menubar submenu should close from ArrowLeft")
  r.pressKeyTestId("menubar-export", "right")
  requireCondition(r.hasTestId("menubar-export-content"), "Menubar submenu should open from ArrowRight")
  r.pressKeyTestId("menubar-export", "left")
  r.pressKeyTestId("menubar-new", "down")
  r.pressKey("enter")
  requireText(r.textContent("last-action"), "Push", "Menubar ArrowDown focus and Enter selection")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar keyboard item selection should close")
  r.clickTestId("menubar-file")
  r.pressKeyTestId("menubar-export", "home")
  r.pressKey("enter")
  requireText(r.textContent("last-action"), "Commit", "Menubar Home should focus the first item")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar Home-selected item should close")
  r.clickTestId("menubar-file")
  r.pressKeyTestId("menubar-new", "end")
  r.pressKey("enter")
  requireCondition(r.hasTestId("menubar-export-content"), "Menubar End should focus and activate the submenu trigger")
  r.pressKeyTestId("menubar-export", "left")
  r.pressKeyTestId("menubar-new", "right")
  r.pressKey("right")
  requireCondition(r.hasTestId("menubar-edit-content"), "Menubar ArrowRight should move across top-level menus")
  r.pressKey("left")
  r.pressKey("left")
  requireCondition(r.hasTestId("menubar-file-content"), "Menubar ArrowLeft should move back across top-level menus")
  r.clickTestId("kobalte-showcase")
  requireCondition(!r.hasTestId("menubar-file-content"), "Menubar should close from outside pointer interaction")

  // Dialog: pointer/keyboard opening, full overlay structure, overlay dismissal,
  // Escape, close button pointer/keyboard, and reopen behavior.
  r.clickTestId("dialog-trigger")
  requireCondition(r.hasTestId("dialog-overlay") && r.hasTestId("dialog-content"), "Dialog pointer trigger should mount overlay and content")
  const overlayStyle = r.styleTestId("dialog-overlay")
  requireCondition(overlayStyle.top === 0 && overlayStyle.right === 0 && overlayStyle.bottom === 0 && overlayStyle.left === 0, "Dialog overlay should fill its viewport positioner")
  requireCondition(overlayStyle.backgroundColor === "rgba(0, 0, 0, 0.2)", "Dialog overlay should match Kobalte's 20% black backdrop")
  requireCondition(r.styleTestId("dialog-content").width === 500, "Dialog should match Kobalte's 500px content width")
  requireCondition(r.styleTestId("dialog-content").borderRadius === 6, "Dialog should match Kobalte's radius")
  r.clickTestId("dialog-overlay")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog overlay click should dismiss")
  r.pressKeyTestId("dialog-trigger", "enter")
  requireCondition(r.hasTestId("dialog-content"), "Dialog should open from Enter")
  r.pressKeyTestId("dialog-content", "escape")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog should close from Escape")
  r.pressKeyTestId("dialog-trigger", "space")
  requireCondition(r.hasTestId("dialog-content"), "Dialog should open from Space")
  r.pressKeyTestId("dialog-close", "enter")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog close button should activate from Enter")
  r.clickTestId("dialog-trigger")
  r.pressKeyTestId("dialog-close", "space")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog close button should activate from Space")
  r.clickTestId("dialog-trigger")
  r.clickTestId("dialog-close")
  requireCondition(!r.hasTestId("dialog-content"), "Dialog close button should activate from pointer click")

  app.unmount()

  // Reproduce the old @gpuix/native 0.4 viewport mismatch explicitly: the native
  // query can report 800x600 while the mounted app is 1180x820. Dialog must use
  // the larger painted/root viewport so the backdrop cannot stop early.
  const viewport = createTestRoot()
  viewport.render(() => <ViewportDialogProbe />)
  const positionerStyle = viewport.renderer.styleTestId("dialog-positioner")
  requireCondition(positionerStyle.width === 1180, `Dialog positioner should use the 1180px app viewport; got ${String(positionerStyle.width)}`)
  requireCondition(positionerStyle.height === 820, `Dialog positioner should use the 820px app viewport; got ${String(positionerStyle.height)}`)
  const viewportOverlay = viewport.renderer.styleTestId("viewport-dialog-overlay")
  requireCondition(viewportOverlay.top === 0 && viewportOverlay.right === 0 && viewportOverlay.bottom === 0 && viewportOverlay.left === 0, "Dialog backdrop should span all four edges of the recovered viewport")
  viewport.unmount()

  const semantic = createTestRoot()
  semantic.render(() => <SemanticSvgProbe />)
  requireCondition(semantic.renderer.hasTestId("inline-svg"), "inline SVG should materialize as the native svg custom element")
  requireText(semantic.renderer.textContent("semantic-span"), "Semantic span", "semantic span mapping")
  const source = String(semantic.renderer.customPropTestId("inline-svg", "source") ?? "")
  requireCondition(source.includes("M18 6l-12 12"), "inline SVG should serialize path markup into the upstream source prop")
  const src = String(semantic.renderer.customPropTestId("inline-svg", "src") ?? "")
  requireCondition(src.startsWith("data:image/svg+xml,"), "inline SVG should keep the data-URI fallback for published native builds")
  semantic.unmount()

  console.log("solid1 Kobalte visual + interaction compatibility showcase: passed")
}
