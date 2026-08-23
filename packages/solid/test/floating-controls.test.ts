import { createComponent, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import type { PublicInstance } from "../src/host/types.js"
import { createRoot } from "../src/root.js"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../src/components/combobox.js"
import { renderDiv, type HostPropSource } from "../src/components/floating.js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../src/components/select.js"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src/components/tooltip.js"
import { FakeRenderer } from "./fake-renderer.js"

class ControlRenderer extends FakeRenderer {
  readonly focused: number[] = []

  focusElement(elementId: number): void {
    this.focused.push(elementId)
  }
}

function hasMutation(
  renderer: FakeRenderer,
  name: string,
  value?: string,
): boolean {
  return renderer.batches.some((batch) =>
    batch.some((mutation) =>
      mutation[0] === name && (value === undefined || mutation.includes(value)),
    ),
  )
}

describe("Solid floating controls", () => {
  it("opens and closes Tooltip from native hover and keyboard events", () => {
    const renderer = new ControlRenderer()
    const root = createRoot(renderer)
    let trigger: PublicInstance | undefined
    const changes: boolean[] = []

    root.render(() => createComponent(TooltipProvider, {
      delayDuration: 0,
      disableHoverableContent: true,
      get children() {
        return createComponent(Tooltip, {
          onOpenChange: (open) => changes.push(open),
          get children() {
            return [
              createComponent(TooltipTrigger, {
                ref: (instance) => {
                  trigger = instance
                },
                children: "Hover me",
              }),
              createComponent(TooltipContent, {
                side: "bottom",
                children: "Tooltip body",
              }),
            ]
          },
        })
      },
    }))

    expect(trigger).toBeDefined()
    root.dispatch({ elementId: trigger?.id ?? 0, eventType: "mouseEnter" })
    expect(changes).toEqual([true])

    root.dispatch({ elementId: trigger?.id ?? 0, eventType: "keyDown", key: "escape" })
    expect(changes).toEqual([true, false])
  })

  it("registers detached Select items and skips disabled items during keyboard selection", () => {
    const renderer = new ControlRenderer()
    const root = createRoot(renderer)
    let trigger: PublicInstance | undefined
    let content: PublicInstance | undefined
    const values: string[] = []

    root.render(() => createComponent(Select, {
      defaultValue: "alpha",
      onValueChange: (value) => values.push(value),
      get children() {
        return [
          createComponent(SelectTrigger, {
            ref: (instance) => {
              trigger = instance
            },
            get children() {
              return createComponent(SelectValue, {})
            },
          }),
          createComponent(SelectContent, {
            ref: (instance) => {
              content = instance
            },
            get children() {
              return [
                createComponent(SelectItem, { value: "alpha", children: "Alpha" }),
                createComponent(SelectItem, {
                  value: "disabled",
                  disabled: true,
                  children: "Disabled",
                }),
                createComponent(SelectItem, { value: "beta", children: "Beta" }),
              ]
            },
          }),
        ]
      },
    }))

    expect(trigger).toBeDefined()
    root.dispatch({ elementId: trigger?.id ?? 0, eventType: "mouseDown" })
    root.dispatch({ elementId: trigger?.id ?? 0, eventType: "click" })
    expect(content).toBeDefined()

    root.dispatch({ elementId: content?.id ?? 0, eventType: "keyDown", key: "down" })
    root.dispatch({ elementId: content?.id ?? 0, eventType: "keyDown", key: "enter" })

    expect(values).toEqual(["beta"])
    expect(renderer.focused.at(-1)).toBe(trigger?.id)
  })

  it("filters Combobox items and selects the active native-input result", () => {
    const renderer = new ControlRenderer()
    const root = createRoot(renderer)
    let input: PublicInstance | undefined
    const values: Array<string | string[] | null> = []
    const frameworks = ["Astro", "SvelteKit", "Next.js"]

    root.render(() => createComponent(Combobox, {
      items: frameworks,
      onValueChange: (value) => values.push(value),
      get children() {
        return [
          createComponent(ComboboxInput, {
            ref: (instance) => {
              input = instance
            },
            placeholder: "Select a framework",
          }),
          createComponent(ComboboxContent, {
            get children() {
              return createComponent(ComboboxList, {
                children: (item) => createComponent(ComboboxItem, {
                  value: item,
                  children: item,
                }),
              })
            },
          }),
        ]
      },
    }))

    expect(input).toBeDefined()
    root.dispatch({ elementId: input?.id ?? 0, eventType: "click" })
    root.dispatch({ elementId: input?.id ?? 0, eventType: "change", value: "s" })
    root.dispatch({ elementId: input?.id ?? 0, eventType: "keyDown", key: "down" })
    root.dispatch({ elementId: input?.id ?? 0, eventType: "submit" })

    expect(values).toEqual(["SvelteKit"])
  })

  it("keeps controlled Select and Combobox popup visibility reactive", () => {
    const selectRenderer = new ControlRenderer()
    const selectRoot = createRoot(selectRenderer)
    const [selectOpen, setSelectOpen] = createSignal(false)

    selectRoot.render(() => createComponent(Select, {
      get open() {
        return selectOpen()
      },
      get children() {
        return createComponent(SelectContent, {
          children: createComponent(SelectItem, { value: "alpha", children: "Alpha" }),
        })
      },
    }))

    expect(hasMutation(selectRenderer, "createElement", "anchored")).toBe(false)
    selectRoot.flushSync(() => setSelectOpen(true))
    expect(hasMutation(selectRenderer, "createElement", "anchored")).toBe(true)

    const selectBatchCount = selectRenderer.batches.length
    selectRoot.flushSync(() => setSelectOpen(false))
    expect(
      selectRenderer.batches.slice(selectBatchCount).some((batch) =>
        batch.some((mutation) => mutation[0] === "destroyElement"),
      ),
    ).toBe(true)

    const comboboxRenderer = new ControlRenderer()
    const comboboxRoot = createRoot(comboboxRenderer)
    const [comboboxOpen, setComboboxOpen] = createSignal(false)

    comboboxRoot.render(() => createComponent(Combobox, {
      items: ["alpha"],
      get open() {
        return comboboxOpen()
      },
      get children() {
        return createComponent(ComboboxContent, {
          get children() {
            return createComponent(ComboboxList, {
              children: (item) => createComponent(ComboboxItem, {
                value: item,
                children: item,
              }),
            })
          },
        })
      },
    }))

    expect(hasMutation(comboboxRenderer, "createElement", "anchored")).toBe(false)
    comboboxRoot.flushSync(() => setComboboxOpen(true))
    expect(hasMutation(comboboxRenderer, "createElement", "anchored")).toBe(true)

    const comboboxBatchCount = comboboxRenderer.batches.length
    comboboxRoot.flushSync(() => setComboboxOpen(false))
    expect(
      comboboxRenderer.batches.slice(comboboxBatchCount).some((batch) =>
        batch.some((mutation) => mutation[0] === "destroyElement"),
      ),
    ).toBe(true)
  })

  it("uses a Solid as-renderer instead of cloning a child element", () => {
    const renderer = new ControlRenderer()
    const root = createRoot(renderer)
    let trigger: PublicInstance | undefined
    let slotted: HostPropSource | undefined

    root.render(() => createComponent(Tooltip, {
      get children() {
        return createComponent(TooltipTrigger, {
          as: (props) => {
            slotted = props
            return renderDiv(props)
          },
          ref: (instance) => {
            trigger = instance
          },
          children: "Custom trigger",
        })
      },
    }))

    expect(trigger).toBeDefined()
    expect(slotted?.tabIndex).toBeUndefined()
    expect(slotted?.onMouseEnter).toBeTypeOf("function")
  })
})
