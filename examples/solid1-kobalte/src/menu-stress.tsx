import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { UpstreamKobalteShowcase } from "./upstream-app"
import { CheckIcon, ChevronRightIcon } from "./upstream/kobalte/components"

interface OpenDialogElements {
  overlay: HTMLElement
  positioner: HTMLElement
  content: HTMLElement
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireMenuState(actual: string, expected: string, absent: string[], label: string): void {
  requireCondition(actual.includes(expected), `${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  for (const stale of absent) {
    requireCondition(!actual.includes(stale), `${label}: stale menu content ${JSON.stringify(stale)} remained in ${JSON.stringify(actual)}`)
  }
}

function requireSubmenuOpensRight(trigger: { x: number; width: number }, submenu: { x: number }, label: string): void {
  requireCondition(
    submenu.x >= trigger.x + trigger.width / 2,
    `${label} should open to the right when the native viewport has room, got trigger=${JSON.stringify(trigger)} submenu=${JSON.stringify(submenu)}`,
  )
}

function requireOpenDialogElements(): OpenDialogElements {
  const content = document.body.querySelectorAll<HTMLElement>("[role=dialog]")[0]
  if (!content) throw new Error("Expected open dialog content")
  const positioner = content.parentElement
  if (!positioner) throw new Error("Expected dialog content positioner")
  const portalLayer = positioner.parentElement
  if (!portalLayer) throw new Error("Expected dialog portal layer")
  const overlay = Array.from(document.body.querySelectorAll<HTMLElement>("[data-expanded]"))
    .find((candidate) => candidate !== content && candidate.parentElement === portalLayer)
  if (!overlay) throw new Error("Expected dialog overlay beside its positioner")
  return { overlay, positioner, content }
}

function describeActiveElement(menuTriggers: readonly HTMLElement[]): string {
  const active = document.activeElement
  if (!active) return "null"
  const triggerIndex = menuTriggers.findIndex((trigger) => trigger === active)
  return JSON.stringify({
    triggerIndex,
    tagName: active.tagName,
    role: active.getAttribute("role"),
    menuTrigger: active.getAttribute("data-kb-menu-value-trigger"),
    ariaLabelledBy: active.getAttribute("aria-labelledby"),
    text: active.textContent?.trim().slice(0, 80) ?? "",
  })
}

function requireFocusDidNotReturnTo(
  staleTrigger: HTMLElement,
  menuTriggers: readonly HTMLElement[],
  label: string,
): void {
  requireCondition(
    document.activeElement !== staleTrigger,
    `${label}: focus returned to the stale menubar trigger; active=${describeActiveElement(menuTriggers)}`,
  )
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

if (hasNativeTestRenderer) {
  const app = createTestRoot()
  const r = app.renderer
  const settle = async (): Promise<void> => {
    await wait(0)
    app.root.flush()
    r.flush()
  }

  // Keep the verbatim fixture narrower than the native 1024px test viewport so
  // the submenu direction assertion has an unambiguous roomy right-hand side.
  app.render(() => (
    <div testId="kobalte-stress-root" style={{ width: 800 }}>
      <UpstreamKobalteShowcase />
    </div>
  ))

  const menuTriggers = Array.from(document.body.querySelectorAll<HTMLElement>("[data-kb-menu-value-trigger]"))
  requireCondition(menuTriggers.length === 3, `Expected three menubar triggers, got ${menuTriggers.length}`)
  const gitTrigger = menuTriggers[0]
  const fileTrigger = menuTriggers[1]
  const editTrigger = menuTriggers[2]
  if (!gitTrigger || !fileTrigger || !editTrigger) throw new Error("Menubar trigger lookup failed")
  for (const trigger of menuTriggers) {
    requireCondition(
      trigger.matches("button:not([disabled]):not([hidden])"),
      "Menubar trigger should satisfy Kobalte's browser focusability selector",
    )
  }

  r.clickTextWithinTestId("upstream-menubar", "Git")
  requireMenuState(r.textContentRoot(), "Commit", ["New Tab", "Undo"], "initial Git menu")

  const githubBounds = r.boundsText("GitHub")
  r.hoverText("GitHub")
  await wait(200)
  await settle()
  const githubSubmenuBounds = r.boundsText("Create Pull Request…")
  requireSubmenuOpensRight(githubBounds, githubSubmenuBounds, "GitHub submenu")

  r.hoverTextWithinTestId("upstream-menubar", "File")
  await settle()
  requireMenuState(r.textContentRoot(), "New Tab", ["Commit", "Undo"], "File submenu direction setup")
  const shareBounds = r.boundsText("Share")
  r.hoverText("Share")
  await wait(200)
  await settle()
  const shareSubmenuBounds = r.boundsText("Email Link")
  requireSubmenuOpensRight(shareBounds, shareSubmenuBounds, "File Share submenu")

  r.hoverTextWithinTestId("upstream-menubar", "Git")
  await settle()

  for (let cycle = 0; cycle < 20; cycle += 1) {
    r.hoverTextWithinTestId("upstream-menubar", "File")
    await settle()
    requireMenuState(r.textContentRoot(), "New Tab", ["Commit", "Undo"], `cycle ${cycle} File hover`)
    requireFocusDidNotReturnTo(gitTrigger, menuTriggers, `cycle ${cycle} File hover`)

    r.hoverTextWithinTestId("upstream-menubar", "Edit")
    await settle()
    requireMenuState(r.textContentRoot(), "Undo", ["Commit", "New Tab"], `cycle ${cycle} Edit hover`)
    requireFocusDidNotReturnTo(fileTrigger, menuTriggers, `cycle ${cycle} Edit hover`)

    r.hoverTextWithinTestId("upstream-menubar", "Git")
    await settle()
    requireMenuState(r.textContentRoot(), "Commit", ["New Tab", "Undo"], `cycle ${cycle} Git hover`)
    requireFocusDidNotReturnTo(editTrigger, menuTriggers, `cycle ${cycle} Git hover`)

    r.clickTextWithinTestId("upstream-menubar", "File")
    await settle()
    requireMenuState(r.textContentRoot(), "New Tab", ["Commit", "Undo"], `cycle ${cycle} File click`)

    r.clickTextWithinTestId("upstream-menubar", "Edit")
    await settle()
    requireMenuState(r.textContentRoot(), "Undo", ["Commit", "New Tab"], `cycle ${cycle} Edit click`)

    r.clickTextWithinTestId("upstream-menubar", "Git")
    await settle()
    requireMenuState(r.textContentRoot(), "Commit", ["New Tab", "Undo"], `cycle ${cycle} Git click`)
  }

  r.clickTestId("upstream-separator")
  await settle()
  const closed = r.textContentRoot()
  requireCondition(
    !closed.includes("Commit") && !closed.includes("New Tab") && !closed.includes("Undo"),
    "Menubar should close after clicking a non-interactive outside region",
  )

  r.clickTextWithinTestId("upstream-dialog", "Open")
  await settle()
  const rootBounds = r.boundsTestId("kobalte-stress-root")
  const dialog = requireOpenDialogElements()
  const overlayBounds = dialog.overlay.getBoundingClientRect()
  const positionerBounds = dialog.positioner.getBoundingClientRect()
  const contentBounds = dialog.content.getBoundingClientRect()
  requireCondition(
    overlayBounds.width >= rootBounds.width - 2 && overlayBounds.height >= rootBounds.height - 2,
    `Dialog overlay should span the native root, got root=${JSON.stringify(rootBounds)} overlay=${JSON.stringify(overlayBounds)}`,
  )
  requireCondition(
    positionerBounds.width >= rootBounds.width - 2 && positionerBounds.height >= rootBounds.height - 2,
    `Dialog positioner should span the native root, got root=${JSON.stringify(rootBounds)} positioner=${JSON.stringify(positionerBounds)}`,
  )
  requireCondition(
    Math.abs(overlayBounds.left - positionerBounds.left) <= 2
      && Math.abs(overlayBounds.top - positionerBounds.top) <= 2
      && Math.abs(overlayBounds.width - positionerBounds.width) <= 2
      && Math.abs(overlayBounds.height - positionerBounds.height) <= 2,
    `Dialog overlay and positioner should share the portal viewport, got overlay=${JSON.stringify(overlayBounds)} positioner=${JSON.stringify(positionerBounds)}`,
  )
  const viewportCenterX = positionerBounds.left + positionerBounds.width / 2
  const viewportCenterY = positionerBounds.top + positionerBounds.height / 2
  const contentCenterX = contentBounds.left + contentBounds.width / 2
  const contentCenterY = contentBounds.top + contentBounds.height / 2
  requireCondition(
    Math.abs(contentCenterX - viewportCenterX) <= 8 && Math.abs(contentCenterY - viewportCenterY) <= 8,
    `Dialog content should be centered in its portal viewport, got positioner=${JSON.stringify(positionerBounds)} content=${JSON.stringify(contentBounds)}`,
  )
  r.pressKey("escape")
  await settle()
  requireCondition(
    document.body.querySelectorAll<HTMLElement>("[role=dialog]").length === 0,
    "Native GPUIX escape keydown should dismiss the real upstream Kobalte Dialog",
  )

  app.render(() => (
    <div>
      <div testId="svg-viewbox-probe"><CheckIcon /></div>
      <div testId="svg-explicit-probe"><ChevronRightIcon width={20} height={20} /></div>
    </div>
  ))
  const viewBoxBounds = r.boundsFirstTypeWithinTestId("svg-viewbox-probe", "svg")
  requireCondition(
    viewBoxBounds.width > 0 && viewBoxBounds.height > 0,
    `Unsized upstream SVG should have native bounds, got ${JSON.stringify(viewBoxBounds)}`,
  )
  const explicitBounds = r.boundsFirstTypeWithinTestId("svg-explicit-probe", "svg")
  requireCondition(
    explicitBounds.width === 20 && explicitBounds.height === 20,
    `Explicit upstream SVG should preserve 20x20 native bounds, got ${JSON.stringify(explicitBounds)}`,
  )

  app.unmount()
  console.log("solid1 Kobalte portal, focus, switch, submenu direction, escape, and SVG stress: passed")
}
