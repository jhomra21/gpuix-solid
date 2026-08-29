import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { UpstreamKobalteShowcase } from "./upstream-app"
import { CheckIcon, ChevronRightIcon } from "./upstream/kobalte/components"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireMenuState(actual: string, expected: string, absent: string[], label: string): void {
  requireCondition(actual.includes(expected), `${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  for (const stale of absent) {
    requireCondition(!actual.includes(stale), `${label}: stale menu content ${JSON.stringify(stale)} remained in ${JSON.stringify(actual)}`)
  }
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

  app.render(() => <UpstreamKobalteShowcase />)

  const menuTriggers = Array.from(document.body.querySelectorAll<HTMLElement>("[data-kb-menu-value-trigger]"))
  requireCondition(menuTriggers.length === 3, `Expected three menubar triggers, got ${menuTriggers.length}`)
  for (const trigger of menuTriggers) {
    requireCondition(
      trigger.matches("button:not([disabled]):not([hidden])"),
      "Menubar trigger should satisfy Kobalte's browser focusability selector",
    )
  }

  r.clickTextWithinTestId("upstream-menubar", "Git")
  requireMenuState(r.textContent("upstream-menubar"), "Commit", ["New Tab", "Undo"], "initial Git menu")

  for (let cycle = 0; cycle < 20; cycle += 1) {
    r.hoverTextWithinTestId("upstream-menubar", "File")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "New Tab", ["Commit", "Undo"], `cycle ${cycle} File hover`)

    r.hoverTextWithinTestId("upstream-menubar", "Edit")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "Undo", ["Commit", "New Tab"], `cycle ${cycle} Edit hover`)

    r.hoverTextWithinTestId("upstream-menubar", "Git")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "Commit", ["New Tab", "Undo"], `cycle ${cycle} Git hover`)

    r.clickTextWithinTestId("upstream-menubar", "File")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "New Tab", ["Commit", "Undo"], `cycle ${cycle} File click`)

    r.clickTextWithinTestId("upstream-menubar", "Edit")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "Undo", ["Commit", "New Tab"], `cycle ${cycle} Edit click`)

    r.clickTextWithinTestId("upstream-menubar", "Git")
    await settle()
    requireMenuState(r.textContent("upstream-menubar"), "Commit", ["New Tab", "Undo"], `cycle ${cycle} Git click`)
  }

  r.clickTestId("upstream-separator")
  await settle()
  const closed = r.textContent("upstream-menubar")
  requireCondition(
    !closed.includes("Commit") && !closed.includes("New Tab") && !closed.includes("Undo"),
    "Menubar should close after clicking a non-interactive outside region",
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
  console.log("solid1 Kobalte menubar focus, switch, and SVG stress: passed")
}
