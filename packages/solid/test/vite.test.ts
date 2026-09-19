import { describe, expect, it } from "vitest"
import { gpuixSolid, gpuixSolidConfig } from "../src/vite.js"

describe("gpuixSolid Vite helper", () => {
  it("encodes the universal-renderer runtime contract", () => {
    expect(gpuixSolidConfig()).toEqual({
      resolve: {
        conditions: ["browser", "development"],
      },
      ssr: {
        noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js"],
        resolve: {
          conditions: ["browser", "development", "import", "default"],
        },
      },
      build: {
        rollupOptions: {
          external: ["@gpuix/native"],
        },
      },
    })
  })

  it("leaves application entry, output directory, and target to the app", () => {
    const config = gpuixSolidConfig()
    expect(config.build?.ssr).toBeUndefined()
    expect(config.build?.outDir).toBeUndefined()
    expect(config.build?.target).toBeUndefined()
  })

  it("returns a Vite plugin group", () => {
    expect(Array.isArray(gpuixSolid())).toBe(true)
  })
})
