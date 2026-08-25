import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { TailwindShowcase } from "./app"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Tailwind native bridge: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => <TailwindShowcase />)

  const darkRoot = app.renderer.styleTestId("tailwind-root")
  requireEqual(darkRoot.display, "flex", "Tailwind flex")
  requireEqual(darkRoot.backgroundColor, "oklch(0.141 0.005 285.823)", "dark background token")
  requireEqual(darkRoot.color, "oklch(0.985 0 0)", "dark foreground token")

  const action = app.renderer.styleTestId("primary-action")
  requireEqual(action.height, 40, "h-10")
  requireEqual(action.paddingLeft, 16, "px-4 left")
  requireEqual(action.paddingRight, 16, "px-4 right")
  requireEqual(action.paddingTop, 8, "py-2 top")
  requireEqual(action.paddingBottom, 8, "py-2 bottom")
  requireEqual(action.gap, 8, "gap-2")
  requireEqual(action.backgroundColor, "oklch(0.985 0 0)", "dark primary token")
  requireEqual(action.color, "oklch(0.21 0.006 285.885)", "dark primary foreground token")
  requireEqual(action.hover?.backgroundColor, "oklch(0.274 0.006 286.033)", "hover accent token")
  requireEqual(action.active?.backgroundColor, "oklch(0.274 0.006 286.033)", "active muted token")

  app.renderer.clickTestId("primary-action")
  requireCondition(app.renderer.textContent("primary-action").includes("1"), "Kobalte button should retain native Tailwind classes while handling presses")

  const classListInitial = app.renderer.styleTestId("classlist-card")
  requireEqual(classListInitial.backgroundColor, "oklch(0.274 0.006 286.033)", "classList initial muted state")
  app.renderer.clickTestId("classlist-toggle")
  const classListSelected = app.renderer.styleTestId("classlist-card")
  requireEqual(classListSelected.backgroundColor, "oklch(0.985 0 0)", "classList selected primary state")

  const inline = app.renderer.styleTestId("inline-precedence")
  requireEqual(inline.backgroundColor, "#7c3aed", "inline style must override generated class style")

  app.renderer.clickTestId("theme-toggle")
  requireCondition(app.renderer.textContent("theme-toggle").includes("light"), "ColorModeProvider should switch to light")
  const lightRoot = app.renderer.styleTestId("tailwind-root")
  requireEqual(lightRoot.backgroundColor, "oklch(1 0 0)", "light background token")
  requireEqual(lightRoot.color, "oklch(0.141 0.005 285.823)", "light foreground token")
  const lightAction = app.renderer.styleTestId("primary-action")
  requireEqual(lightAction.backgroundColor, "oklch(0.21 0.006 285.885)", "light primary token")
  requireEqual(lightAction.color, "oklch(0.985 0 0)", "light primary foreground token")

  app.unmount()
  console.log("solid1 Tailwind native bridge: passed")
}
