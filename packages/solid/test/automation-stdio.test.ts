import { describe, expect, it } from "vitest"
import {
  App,
  AutomationError,
  type AutomationBackend,
  type AutomationTreeNode,
  type ElementBounds,
} from "../src/automation.js"
import {
  connectStdio,
  SseAutomationBackend,
} from "../src/automation/stdio.js"
import {
  LiveAutomationBackend,
  handleAutomationRequest,
  type LiveAutomationRenderer,
} from "../src/automation/server.js"
import {
  createSseDecoder,
  encodeSse,
  PROTOCOL_VERSION,
} from "../src/automation/protocol.js"

const tree: AutomationTreeNode = {
  id: 1,
  type: "div",
  testId: "root",
  children: [
    {
      id: 2,
      type: "div",
      testId: "action",
      text: "Run",
      bounds: { x: 10, y: 20, width: 100, height: 40 },
    },
    {
      id: 3,
      type: "input",
      testId: "field",
      bounds: { x: 10, y: 70, width: 200, height: 40 },
    },
  ],
}

class RecordingBackend implements AutomationBackend {
  readonly clicks: Array<[number, number]> = []
  readonly keys: Array<[number, string]> = []
  readonly screenshots: string[] = []
  nowMs = 0

  getTree(): AutomationTreeNode {
    return tree
  }

  getBounds(elementId: number): ElementBounds | null {
    if (elementId === 2) return { x: 10, y: 20, width: 100, height: 40 }
    if (elementId === 3) return { x: 10, y: 70, width: 200, height: 40 }
    return null
  }

  click(x: number, y: number): void {
    this.clicks.push([x, y])
  }

  keystrokes(elementId: number, keys: string): void {
    this.keys.push([elementId, keys])
  }

  screenshot(path: string): void {
    this.screenshots.push(path)
  }

  clockPause(): number {
    return this.nowMs
  }

  clockSet(nowMs: number): number {
    this.nowMs = nowMs
    return nowMs
  }

  clockFastForward(deltaMs: number): number {
    this.nowMs += deltaMs
    return this.nowMs
  }

  clockResume(): number {
    return this.nowMs
  }

  close(): void {}
}

async function connectInMemory(backend: AutomationBackend): Promise<App> {
  let clientFeed: ((chunk: string) => void) | undefined
  const serverDecoder = createSseDecoder((message) => {
    if (!("method" in message)) return
    void handleAutomationRequest(message, backend).then((reply) => {
      clientFeed?.(reply)
    })
  })

  return await connectStdio({
    write(chunk) {
      serverDecoder.feed(chunk)
    },
    feed(listener) {
      clientFeed = listener
    },
  })
}

describe("automation stdio protocol", () => {
  it("decodes SSE across chunk boundaries", () => {
    const messages: string[] = []
    const decoder = createSseDecoder((message) => {
      if ("method" in message) messages.push(message.method)
    })
    const encoded = encodeSse({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        client: "test",
      },
    })

    const middle = Math.floor(encoded.length / 2)
    decoder.feed(encoded.slice(0, middle))
    expect(messages).toEqual([])
    decoder.feed(encoded.slice(middle))
    expect(messages).toEqual(["initialize"])
  })

  it("round-trips locators, actions, clock, and screenshot over stdio", async () => {
    const backend = new RecordingBackend()
    const app = await connectInMemory(backend)

    expect(await app.getByTestId("action").textContent()).toBe("Run")
    await app.getByTestId("action").click()
    expect(backend.clicks).toEqual([[60, 40]])

    await app.getByTestId("field").fill("hi")
    const selectAll = process.platform === "darwin" ? "cmd-a" : "ctrl-a"
    expect(backend.keys).toEqual([[3, `${selectAll} h i`]])

    expect(await app.clock.pause()).toBe(0)
    expect(await app.clock.set(100)).toBe(100)
    expect(await app.clock.fastForward(25)).toBe(125)
    expect(await app.clock.resume()).toBe(125)

    expect(await app.screenshot({ path: "/tmp/stdio.png" })).toBe("/tmp/stdio.png")
    expect(backend.screenshots).toEqual(["/tmp/stdio.png"])
    await app.close()
  })

  it("propagates typed backend errors across the wire", async () => {
    class UnsupportedBackend extends RecordingBackend {
      override keystrokes(): never {
        throw new AutomationError("Unsupported", "not available")
      }
    }

    const app = await connectInMemory(new UnsupportedBackend())
    await expect(app.getByTestId("field").fill("x")).rejects.toMatchObject({
      name: "AutomationError",
      code: "Unsupported",
      message: "not available",
    })
  })

  it("rejects pending requests when the client closes", async () => {
    let feed: ((chunk: string) => void) | undefined
    const writes: string[] = []
    const backend = new SseAutomationBackend(
      (chunk) => writes.push(chunk),
      (listener) => {
        feed = listener
      },
    )

    const pending = backend.getTree()
    expect(writes).toHaveLength(1)
    expect(feed).toBeDefined()
    await backend.close()
    await expect(pending).rejects.toMatchObject({ code: "Closed" })
  })
})

class FakeLiveRenderer implements LiveAutomationRenderer {
  clicks: Array<[number, number]> = []
  focus: number[] = []
  keys: string[] = []
  ticks = 0

  tick(): boolean {
    this.ticks++
    return true
  }

  simulateClick(x: number, y: number): void {
    this.clicks.push([x, y])
  }

  simulateKeystrokes(keys: string): void {
    this.keys.push(keys)
  }

  focusElement(elementId: number): void {
    this.focus.push(elementId)
  }

  blur(): void {}
  scrollTo(): void {}
  getScrollOffset(): number[] | null { return null }
  getAllText(): string[] { return [] }
  getPaintedText(): string[] { return [] }
  getSelectedText(): string | null { return null }
  clearSelection(): void {}
  captureScreenshot(): void {}
  getAutomationTree(): string { return JSON.stringify(tree) }
  getElementBounds(): number[] | null { return [10, 20, 100, 40] }
  clockPause(): number { return 0 }
  clockSet(nowMs: number): number { return nowMs }
  clockFastForward(deltaMs: number): number { return deltaMs }
  clockResume(): number { return 0 }
}

describe("live automation backend", () => {
  it("ticks after native clicks and exposes tree/bounds", () => {
    const renderer = new FakeLiveRenderer()
    const backend = new LiveAutomationBackend(renderer)

    backend.click(12, 34)
    expect(renderer.clicks).toEqual([[12, 34]])
    expect(renderer.ticks).toBe(1)
    expect(backend.getTree()?.testId).toBe("root")
    expect(backend.getBounds(2)).toEqual({ x: 10, y: 20, width: 100, height: 40 })
  })

  it("focuses the requested element and injects live native keystrokes", () => {
    const renderer = new FakeLiveRenderer()
    const backend = new LiveAutomationBackend(renderer)

    backend.keystrokes(3, "cmd-a h i")
    expect(renderer.focus).toEqual([3])
    expect(renderer.keys).toEqual(["cmd-a h i"])
    expect(renderer.ticks).toBe(1)
  })
})
