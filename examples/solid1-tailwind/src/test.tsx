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
  requireEqual(darkRoot.backgroundColor, "#09090b", "dark background token must target the published native color grammar")
  requireEqual(darkRoot.color, "#fafafa", "dark foreground token must target the published native color grammar")
  requireEqual(app.renderer.styleTestId("tailwind-title").color, "#fafafa", "root foreground must inherit through native Solid children")

  const textSmall = app.renderer.styleTestId("tailwind-text-sm")
  requireEqual(textSmall.fontSize, 14, "text-sm font size")
  requireEqual(textSmall.lineHeight, 20, "text-sm line height")
  requireEqual(textSmall.color, "#9f9fa9", "muted foreground token")

  const card = app.renderer.styleTestId("tailwind-card")
  requireEqual(card.backgroundColor, "#0d0d0f", "dark app surface token")
  requireEqual(card.borderColor, "#27272a", "dark border token")

  const action = app.renderer.styleTestId("primary-action")
  requireEqual(action.height, 40, "h-10")
  requireEqual(action.paddingLeft, 16, "px-4 left")
  requireEqual(action.paddingRight, 16, "px-4 right")
  requireEqual(action.paddingTop, 8, "py-2 top")
  requireEqual(action.paddingBottom, 8, "py-2 bottom")
  requireEqual(action.gap, 8, "gap-2")
  requireEqual(action.backgroundColor, "#fafafa", "dark primary token")
  requireEqual(action.color, "#18181b", "dark primary foreground token")
  requireEqual(action.hover?.backgroundColor, "#27272a", "hover accent token")
  requireEqual(action.hover?.color, "#fafafa", "hover accent foreground token")
  requireEqual(action.active?.backgroundColor, "#27272a", "active muted token")
  requireEqual(app.renderer.styleTestId("primary-action-label").color, "#18181b", "button foreground must inherit into its label")

  app.renderer.clickTestId("primary-action")
  requireCondition(app.renderer.textContent("primary-action").includes("1"), "Kobalte button should retain native Tailwind classes while handling presses")

  const classListInitial = app.renderer.styleTestId("classlist-card")
  requireEqual(classListInitial.backgroundColor, "#27272a", "classList initial muted state")
  app.renderer.clickTestId("classlist-toggle")
  const classListSelected = app.renderer.styleTestId("classlist-card")
  requireEqual(classListSelected.backgroundColor, "#fafafa", "classList selected primary state")

  const inline = app.renderer.styleTestId("inline-precedence")
  requireEqual(inline.backgroundColor, "#7c3aed", "inline style must override generated class style")
  requireEqual(app.renderer.styleTestId("inline-precedence-label").color, "#18181b", "inline precedence label must inherit the class foreground")

  app.renderer.clickTestId("theme-toggle")
  requireCondition(app.renderer.textContent("theme-toggle").includes("light"), "ColorModeProvider should switch to light")
  const lightRoot = app.renderer.styleTestId("tailwind-root")
  requireEqual(lightRoot.backgroundColor, "#ffffff", "light background token")
  requireEqual(lightRoot.color, "#09090b", "light foreground token")
  requireEqual(app.renderer.styleTestId("tailwind-title").color, "#09090b", "light root foreground must inherit")
  const lightAction = app.renderer.styleTestId("primary-action")
  requireEqual(lightAction.backgroundColor, "#18181b", "light primary token")
  requireEqual(lightAction.color, "#fafafa", "light primary foreground token")
  requireEqual(app.renderer.styleTestId("primary-action-label").color, "#fafafa", "light button foreground must inherit into its label")

  app.unmount()
  console.log("solid1 Tailwind native bridge: passed")
}
