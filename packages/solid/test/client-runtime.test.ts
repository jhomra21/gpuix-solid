import { describe, expect, it } from "vitest"
import {
  assertSolidClientRuntime,
  isSolidClientRuntimeReactive,
} from "../src/client-runtime.js"

describe("Solid client runtime guard", () => {
  it("accepts the live Solid runtime used by the package tests", () => {
    expect(isSolidClientRuntimeReactive()).toBe(true)
    expect(() => assertSolidClientRuntime()).not.toThrow()
  })

  it("fails with an actionable Vite hint when reactivity is unavailable", () => {
    expect(() => assertSolidClientRuntime(() => false)).toThrow(
      /browser export condition.*gpuix-solid\/vite/u,
    )
  })
})
