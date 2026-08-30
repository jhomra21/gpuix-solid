import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  createHostText,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

function fixture() {
  const renderer = new FakeRenderer()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const root = new HostRootNode(renderer, events, driver)
  return { renderer, driver, root }
}

describe("native intrinsic forwarding", () => {
  it("forwards img, svg, and canvas contracts", () => {
    const { renderer, driver, root } = fixture()
    const container = createHostElement("div")
    const image = createHostElement("img")
    const svg = createHostElement("svg")
    const canvas = createHostElement("canvas")

    setHostProperty(image, "src", "fixture.png", undefined)
    setHostProperty(image, "objectFit", "contain", undefined)
    setHostProperty(image, "alt", "fixture", undefined)
    setHostProperty(svg, "src", "fixture.svg", undefined)
    setHostProperty(svg, "style", { color: "#fff" }, undefined)
    setHostProperty(canvas, "style", { width: 120, height: 80 }, undefined)

    insertHostNode(container, image)
    insertHostNode(container, svg)
    insertHostNode(container, canvas)
    insertHostNode(root, container)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["createElement", 2, "img"])
    expect(batch).toContainEqual(["setCustomProp", 2, "src", "fixture.png"])
    expect(batch).toContainEqual(["setCustomProp", 2, "objectFit", "contain"])
    expect(batch).toContainEqual(["setCustomProp", 2, "alt", "fixture"])
    expect(batch).toContainEqual(["createElement", 3, "svg"])
    expect(batch).toContainEqual(["setCustomProp", 3, "src", "fixture.svg"])
    expect(batch).toContainEqual(["setStyle", 3, { color: "#fff" }])
    expect(batch).toContainEqual(["createElement", 4, "canvas"])
    expect(batch).toContainEqual(["setStyle", 4, { width: 120, height: 80 }])
  })

  it("forwards input and textarea editor props and events", () => {
    const { renderer, driver, root } = fixture()
    const container = createHostElement("div")
    const input = createHostElement("input")
    const textarea = createHostElement("textarea")
    const onChange = () => {}
    const onSubmit = () => {}
    const theme = { appearance: "dark", caret: "#fff" }

    setHostProperty(input, "value", "hello", undefined)
    setHostProperty(input, "placeholder", "Type", undefined)
    setHostProperty(input, "readOnly", true, undefined)
    setHostProperty(input, "theme", theme, undefined)
    setHostProperty(input, "onChange", onChange, undefined)
    setHostProperty(input, "onSubmit", onSubmit, undefined)

    setHostProperty(textarea, "value", "multiline", undefined)
    setHostProperty(textarea, "minRows", 2, undefined)
    setHostProperty(textarea, "maxRows", 6, undefined)
    setHostProperty(textarea, "theme", theme, undefined)
    setHostProperty(textarea, "onChange", onChange, undefined)

    insertHostNode(container, input)
    insertHostNode(container, textarea)
    insertHostNode(root, container)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["createElement", 2, "input"])
    expect(batch).toContainEqual(["setCustomProp", 2, "value", "hello"])
    expect(batch).toContainEqual(["setCustomProp", 2, "placeholder", "Type"])
    expect(batch).toContainEqual(["setCustomProp", 2, "readOnly", true])
    expect(batch).toContainEqual(["setCustomProp", 2, "theme", theme])
    expect(batch).toContainEqual(["setEventListener", 2, "change", true])
    expect(batch).toContainEqual(["setEventListener", 2, "submit", true])

    expect(batch).toContainEqual(["createElement", 3, "textarea"])
    expect(batch).toContainEqual(["setCustomProp", 3, "value", "multiline"])
    expect(batch).toContainEqual(["setCustomProp", 3, "minRows", 2])
    expect(batch).toContainEqual(["setCustomProp", 3, "maxRows", 6])
    expect(batch).toContainEqual(["setEventListener", 3, "change", true])
  })

  it("forwards the anchored positioning contract", () => {
    const { renderer, driver, root } = fixture()
    const anchored = createHostElement("anchored")
    const child = createHostText("popover")

    setHostProperty(anchored, "position", { x: 20, y: 30 }, undefined)
    setHostProperty(anchored, "side", "bottom", undefined)
    setHostProperty(anchored, "align", "center", undefined)
    setHostProperty(anchored, "gap", 8, undefined)
    setHostProperty(anchored, "anchor", "bottomCenter", undefined)
    setHostProperty(anchored, "offset", { x: 1, y: 2 }, undefined)
    setHostProperty(anchored, "fit", "switch", undefined)
    setHostProperty(anchored, "snapMargin", 10, undefined)
    setHostProperty(anchored, "deferred", true, undefined)
    setHostProperty(anchored, "priority", 1, undefined)
    setHostProperty(anchored, "occlude", true, undefined)
    insertHostNode(anchored, child)
    insertHostNode(root, anchored)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["createElement", 1, "anchored"])
    expect(batch).toContainEqual(["setCustomProp", 1, "position", { x: 20, y: 30 }])
    expect(batch).toContainEqual(["setCustomProp", 1, "side", "bottom"])
    expect(batch).toContainEqual(["setCustomProp", 1, "align", "center"])
    expect(batch).toContainEqual(["setCustomProp", 1, "gap", 8])
    expect(batch).toContainEqual(["setCustomProp", 1, "anchor", "bottomCenter"])
    expect(batch).toContainEqual(["setCustomProp", 1, "offset", { x: 1, y: 2 }])
    expect(batch).toContainEqual(["setCustomProp", 1, "fit", "switch"])
    expect(batch).toContainEqual(["setCustomProp", 1, "snapMargin", 10])
    expect(batch).toContainEqual(["setCustomProp", 1, "deferred", true])
    expect(batch).toContainEqual(["setCustomProp", 1, "priority", 1])
    expect(batch).toContainEqual(["setCustomProp", 1, "occlude", true])
    expect(batch).toContainEqual(["appendChild", 1, 2])
  })

  it("forwards code, diff, and markdown native text contracts", () => {
    const { renderer, driver, root } = fixture()
    const container = createHostElement("div")
    const code = createHostElement("code")
    const diff = createHostElement("diff")
    const markdown = createHostElement("markdown")
    const onToggle = () => {}
    const onShowMore = () => {}
    const onLine = () => {}
    const onLink = () => {}
    const theme = { appearance: "light", accent: "#3366ff" }

    setHostProperty(code, "code", "const solid = 2", undefined)
    setHostProperty(code, "language", "ts", undefined)
    setHostProperty(code, "path", "fixture.ts", undefined)
    setHostProperty(code, "showLineNumbers", true, undefined)
    setHostProperty(code, "showHeader", true, undefined)
    setHostProperty(code, "theme", theme, undefined)

    setHostProperty(diff, "patch", "@@ -1 +1 @@\n-old\n+new", undefined)
    setHostProperty(diff, "wordDiff", true, undefined)
    setHostProperty(diff, "collapsedPaths", ["old.ts"], undefined)
    setHostProperty(diff, "scroll", true, undefined)
    setHostProperty(diff, "maxLines", 100, undefined)
    setHostProperty(diff, "theme", theme, undefined)
    setHostProperty(diff, "onToggleFile", onToggle, undefined)
    setHostProperty(diff, "onShowMore", onShowMore, undefined)
    setHostProperty(diff, "onLineClick", onLine, undefined)

    setHostProperty(markdown, "source", "# GPUIX Solid", undefined)
    setHostProperty(markdown, "theme", theme, undefined)
    setHostProperty(markdown, "onLinkClick", onLink, undefined)

    insertHostNode(container, code)
    insertHostNode(container, diff)
    insertHostNode(container, markdown)
    insertHostNode(root, container)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["createElement", 2, "code"])
    expect(batch).toContainEqual(["setCustomProp", 2, "code", "const solid = 2"])
    expect(batch).toContainEqual(["setCustomProp", 2, "language", "ts"])
    expect(batch).toContainEqual(["setCustomProp", 2, "path", "fixture.ts"])
    expect(batch).toContainEqual(["setCustomProp", 2, "showLineNumbers", true])
    expect(batch).toContainEqual(["setCustomProp", 2, "showHeader", true])
    expect(batch).toContainEqual(["setCustomProp", 2, "theme", theme])

    expect(batch).toContainEqual(["createElement", 3, "diff"])
    expect(batch).toContainEqual(["setCustomProp", 3, "wordDiff", true])
    expect(batch).toContainEqual(["setCustomProp", 3, "collapsedPaths", ["old.ts"]])
    expect(batch).toContainEqual(["setCustomProp", 3, "scroll", true])
    expect(batch).toContainEqual(["setCustomProp", 3, "maxLines", 100])
    expect(batch).toContainEqual(["setEventListener", 3, "toggleFile", true])
    expect(batch).toContainEqual(["setEventListener", 3, "showMore", true])
    expect(batch).toContainEqual(["setEventListener", 3, "lineClick", true])

    expect(batch).toContainEqual(["createElement", 4, "markdown"])
    expect(batch).toContainEqual(["setCustomProp", 4, "source", "# GPUIX Solid"])
    expect(batch).toContainEqual(["setCustomProp", 4, "theme", theme])
    expect(batch).toContainEqual(["setEventListener", 4, "linkClick", true])
  })

  it("forwards virtual-list props and clears removed values", () => {
    const { renderer, driver, root } = fixture()
    const list = createHostElement("virtual-list")
    const row = createHostText("row")

    setHostProperty(list, "alignment", "bottom", undefined)
    setHostProperty(list, "followTail", true, undefined)
    setHostProperty(list, "overdraw", 4, undefined)
    setHostProperty(list, "estimatedItemHeight", 28, undefined)
    setHostProperty(list, "style", { height: 200 }, undefined)
    insertHostNode(list, row)
    insertHostNode(root, list)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["createElement", 1, "virtual-list"])
    expect(batch).toContainEqual(["setCustomProp", 1, "alignment", "bottom"])
    expect(batch).toContainEqual(["setCustomProp", 1, "followTail", true])
    expect(batch).toContainEqual(["setCustomProp", 1, "overdraw", 4])
    expect(batch).toContainEqual(["setCustomProp", 1, "estimatedItemHeight", 28])
    expect(batch).toContainEqual(["setStyle", 1, { height: 200 }])
    expect(batch).toContainEqual(["appendChild", 1, 2])

    setHostProperty(list, "followTail", undefined, true)
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([
      ["setCustomProp", 1, "followTail", null],
    ])
  })
})
