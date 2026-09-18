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
    expect(typeof dialog.openFile).toBe("function")
    expect(typeof dialog.saveFile).toBe("function")
    expect(typeof dialog.message).toBe("function")
    expect(typeof shell.openWithSystem).toBe("function")
    expect(typeof shell.revealPath).toBe("function")
    expect(new DesktopUnsupportedError("unsupported").name).toBe("DesktopUnsupportedError")
  })
})
