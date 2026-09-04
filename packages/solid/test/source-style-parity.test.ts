import { describe, expect, it } from "vitest"
import {
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  resolveNativeClassStyle,
} from "../src/native-style.js"
import type { HostElementNode } from "../src/host/nodes.js"
import {
  createElement,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import { createRoot, type Root } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

function element(tag: string): HostElementNode {
  const node = createElement(tag)
  if (node.kind !== "element") throw new TypeError(`Expected host element for ${tag}`)
  return node
}

describe("copied Solid source styling", () => {
  it("renders semantic source tags through the native class manifest", () => {
    configureNativeStyleManifest({
      classes: {
        panel: {
          base: { display: "flex", backgroundColor: "#111111", fontWeight: 600 },
          descendants: {
            span: { base: { fontSize: 13 } },
            ">span": { base: { paddingLeft: 7 } },
          },
        },
        foreground: { base: { color: "#eeeeee" } },
        active: { base: { opacity: 0.5 } },
        uppercase: { textTransform: "uppercase" },
      },
    })

    let root: Root | undefined
    try {
      const renderer = new FakeRenderer()
      root = createRoot(renderer)
      const section = element("section")
      const span = element("span")

      setProp(section, "class", "panel uppercase")
      setProp(section, "classList", { active: true })
      setProp(span, "class", "foreground")
      insert(span, "Copied source")
      insertNode(section, span)
      root.render(() => section)

      expect(section.type).toBe("div")
      expect(section.style.backgroundColor).toBe("#111111")
      expect(section.style.opacity).toBe(0.5)
      expect(span.type).toBe("text")
      expect(span.style.color).toBe("#eeeeee")
      expect(span.style.fontWeight).toBe(600)
      expect(span.style.fontSize).toBe(13)
      expect(span.style.paddingLeft).toBe(7)
      expect(span.children[0]?.kind).toBe("text")
      if (span.children[0]?.kind === "text") expect(span.children[0].text).toBe("COPIED SOURCE")
    } finally {
      root?.unmount()
      clearNativeStyleManifest()
    }
  })

  it("normalizes source sRGB transparent color mixes", () => {
    configureNativeStyleManifest({
      classes: {
        clip: { base: { backgroundColor: "color-mix(in srgb, #00a76c 20%, transparent)" } },
      },
    })
    try {
      expect(resolveNativeClassStyle("clip", undefined)?.backgroundColor).toBe("rgba(0, 167, 108, 0.2)")
    } finally {
      clearNativeStyleManifest()
    }
  })

  it("serializes copied inline SVG markup into the native svg source", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    try {
      const svg = element("svg")
      const path = element("path")

      setProp(svg, "viewBox", "0 0 16 16")
      setProp(path, "d", "M2 8h12")
      setProp(path, "stroke", "currentColor")
      setProp(path, "strokeWidth", 2)
      insertNode(svg, path)
      root.render(() => svg)

      const source = String(svg.props.get("source") ?? "")
      expect(source).toContain('<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">')
      expect(source).toContain('<path d="M2 8h12" stroke="currentColor" stroke-width="2"></path>')
    } finally {
      root.unmount()
    }
  })
})
