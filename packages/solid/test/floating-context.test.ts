import { createRoot } from "solid-js"
import { describe, expect, it } from "vitest"
import { ComboboxInput } from "../src/components/combobox.js"
import { SelectTrigger } from "../src/components/select.js"
import { TooltipContent } from "../src/components/tooltip.js"

describe("floating control context boundaries", () => {
  it("fails at the Select component boundary without a provider", () => {
    expect(() => createRoot(() => SelectTrigger({ children: "Trigger" }))).toThrow(
      "SelectTrigger must be used inside Select",
    )
  })

  it("fails at the Combobox component boundary without a provider", () => {
    expect(() => createRoot(() => ComboboxInput({ placeholder: "Search" }))).toThrow(
      "ComboboxInput must be used inside Combobox",
    )
  })

  it("fails at the Tooltip component boundary without a provider", () => {
    expect(() => createRoot(() => TooltipContent({ children: "Tooltip" }))).toThrow(
      "TooltipContent must be used inside Tooltip",
    )
  })
})
