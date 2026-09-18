import { describe, expect, it } from "vitest"
import { createHostElement } from "../src/host/nodes.js"
import {
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  resolveNativeClassStyle,
} from "../src/native-style.js"
import { parseNativeUtilities } from "../src/utilities.js"
import { createRoot } from "../src/root.js"
import { setProp } from "../src/host/universal.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("native utility classes", () => {
  it("compiles the solid-gpui utility subset into GPUIX styles", () => {
    expect(parseNativeUtilities(
      "flex flex-col items-center gap-2 p-4 -mt-2 w-full text-sm font-semibold bg-blue-500 rounded-lg opacity-75 hover:bg-blue-600 active:opacity-50",
    )).toEqual({
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 16,
        marginTop: -8,
        width: "100%",
        fontSize: 14,
        fontWeight: 600,
        backgroundColor: "#3b82f6",
        borderRadius: 8,
        opacity: 0.75,
        hover: { backgroundColor: "#2563eb" },
        active: { opacity: 0.5 },
      },
      unknown: [],
    })
  })

  it("reports unsupported utility tokens instead of guessing", () => {
    expect(parseNativeUtilities("flex sm:flex shadow-xl")).toEqual({
      style: { display: "flex" },
      unknown: ["sm:flex", "shadow-xl"],
    })
  })

  it("renders fully supported utility-only classes without a generated manifest", () => {
    clearNativeStyleManifest()
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = createHostElement("div")

    try {
      setProp(node, "class", "flex items-center px-3 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800")
      root.render(() => node)

      expect(node.style).toMatchObject({
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: "#18181b",
        color: "#ffffff",
        borderRadius: 6,
        hover: { backgroundColor: "#27272a" },
      })
    } finally {
      root.unmount()
      clearNativeStyleManifest()
    }
  })

  it("keeps custom source classes strict when no manifest is configured", () => {
    clearNativeStyleManifest()
    expect(() => resolveNativeClassStyle("app-surface", undefined)).toThrow(
      /cannot compile "app-surface" as built-in utilities/,
    )
  })

  it("keeps generated manifest classes authoritative when configured", () => {
    configureNativeStyleManifest({
      classes: {
        "app-surface": { base: { backgroundColor: "#123456" } },
      },
    })
    try {
      expect(resolveNativeClassStyle("app-surface", undefined)).toEqual({
        backgroundColor: "#123456",
      })
      expect(() => resolveNativeClassStyle("p-4", undefined)).toThrow(
        /manifest is missing Tailwind candidate "p-4"/,
      )
    } finally {
      clearNativeStyleManifest()
    }
  })
})
