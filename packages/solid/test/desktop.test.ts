import { describe, expect, it } from "vitest"
import { appMenu, DesktopUnsupportedError, dialog, shell } from "../src/desktop.js"

describe("desktop integration surface", () => {
  it("maps the default app menu label to GPUIX WindowOptions", () => {
    expect(appMenu.default("  GPUix Solid  ")).toEqual({ appName: "GPUix Solid" })
    expect(appMenu.supportsCustomItems).toBe(false)
  })

  it("rejects an empty application menu label", () => {
    expect(() => appMenu.default("   ")).toThrow(TypeError)
  })

  it("exports desktop operations without executing them during module load", () => {
    expect(dialog.openFile).toBeDefined()
    expect(dialog.saveFile).toBeDefined()
    expect(dialog.message).toBeDefined()
    expect(shell.openWithSystem).toBeDefined()
    expect(shell.revealPath).toBeDefined()
    expect(new DesktopUnsupportedError("unsupported").name).toBe("DesktopUnsupportedError")
  })
})
