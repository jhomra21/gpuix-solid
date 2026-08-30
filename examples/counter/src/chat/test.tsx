import assert from "node:assert/strict"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type TestElement,
  type TestRoot,
} from "gpuix-solid"
import { ChatApp, SafeMdxContent, SafeMdxTranscript } from "./app"

const WIDTH = 1180
const HEIGHT = 820

function mount(props: { turnCount?: number; includeSafeMdx?: boolean } = {}): TestRoot {
  const root = createTestRoot(WIDTH, HEIGHT)
  root.render(() => <ChatApp {...props} />)
  return root
}

async function close(root: TestRoot, app?: App): Promise<void> {
  await app?.close()
  root.unmount()
}

function requiredElement(element: TestElement | undefined, label: string): TestElement {
  if (!element) throw new Error(`Missing ${label}`)
  return element
}

function requiredBounds(root: TestRoot, element: TestElement): [number, number, number, number] {
  const raw = root.renderer.getElementBounds(element.id)
  if (!raw || raw.length < 4) throw new Error(`Missing bounds for element ${element.id}`)
  const x = raw[0]
  const y = raw[1]
  const width = raw[2]
  const height = raw[3]
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error(`Incomplete bounds for element ${element.id}`)
  }
  return [x, y, width, height]
}

async function rendersComposedMdx(): Promise<void> {
  const root = createTestRoot(800, 760)
  try {
    root.render(() => <SafeMdxTranscript />)
    assert.equal(root.renderer.findByType("markdown").length, 0)
    assert.equal(root.renderer.findByType("code").length, 1)
    const painted = root.renderer.getPaintedText()
    assert.ok(painted.includes("Solid-composed Markdown"))
    assert.ok(painted.includes("safe-mdx"))
    assert.ok(painted.includes("Custom MDX component"))
    assert.ok(painted.includes("Path"))
    assert.ok(painted.includes("Framework-composed Markdown and custom components"))
    assert.ok(root.renderer.findByType("text").length > 20)
  } finally {
    root.unmount()
  }
}

async function wrapsNarrowMdxList(): Promise<void> {
  const root = createTestRoot(420, 320)
  try {
    const sentence = "a second item with a long sentence that must wrap without leaving the transcript column"
    root.render(() => (
      <div style={{ width: 280, padding: 12, backgroundColor: "#111111" }}>
        <SafeMdxContent source={`- ${sentence}`} />
      </div>
    ))
    const column = requiredElement(
      root.renderer.findByType("div").find((element) => element.style.width === 280),
      "narrow MDX column",
    )
    const item = requiredElement(root.renderer.findByText(sentence), "wrapped list text")
    const [columnX, , columnWidth] = requiredBounds(root, column)
    const [itemX, , itemWidth, itemHeight] = requiredBounds(root, item)
    assert.ok(itemX + itemWidth <= columnX + columnWidth + 1)
    assert.ok(itemHeight > 20)
  } finally {
    root.unmount()
  }
}

async function rendersApplicationSurface(): Promise<void> {
  const root = mount()
  try {
    const transcript = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript")
    assert.equal(transcript.children.length, 20)
    const painted = root.renderer.getPaintedText()
    for (const text of [
      "New Task",
      "Search",
      "Yesterday",
      "give me a quick overview",
      "Do anything...",
      "DeepSeek V4 Flash",
      "Local",
    ]) {
      assert.ok(painted.includes(text), `expected painted chat text: ${text}`)
    }
    assert.ok(painted.some((line) => line.includes("Solid renderer for GPUI")))
    const icons = root.renderer.findByType("svg")
    assert.ok(icons.length > 8)
    assert.ok(icons.every((icon) => String(icon.customProps?.source ?? "").length > 0))
  } finally {
    root.unmount()
  }
}

async function scrollsTranscript(): Promise<void> {
  const root = mount()
  try {
    const transcript = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript")
    assert.ok(!root.renderer.getPaintedText().includes("Which models should I wire up?"))
    root.renderer.scrollToItem(transcript.id, transcript.children.length - 1)
    root.renderer.flush()
    assert.ok(root.renderer.getPaintedText().includes("Which models should I wire up?"))
  } finally {
    root.unmount()
  }
}

async function protectsSidebarSelection(): Promise<void> {
  const root = mount()
  try {
    const sidebarTitle = requiredElement(
      root.renderer.findByText("Native SDK vs GPUI comparison"),
      "sidebar conversation title",
    )
    const [sidebarX, sidebarY, sidebarWidth, sidebarHeight] = requiredBounds(root, sidebarTitle)
    const sidebarSelected = root.renderer.dragSelect(
      sidebarX + 2,
      sidebarY + sidebarHeight / 2,
      sidebarX + Math.max(4, sidebarWidth - 2),
      sidebarY + sidebarHeight / 2,
    )
    assert.equal(sidebarSelected, null)

    const message = requiredElement(
      root.renderer.findByText("GPUix Solid"),
      "transcript message text",
    )
    const [messageX, messageY, messageWidth, messageHeight] = requiredBounds(root, message)
    const selected = root.renderer.dragSelect(
      messageX + 2,
      messageY + Math.min(8, messageHeight / 2),
      messageX + Math.min(messageWidth - 2, 140),
      messageY + Math.min(8, messageHeight / 2),
    )
    assert.ok(selected)
    assert.ok(!selected.includes("Native SDK vs GPUI comparison"))
  } finally {
    root.unmount()
  }
}

async function changesModel(): Promise<void> {
  const root = mount()
  const app = createTestApp(root.renderer)
  try {
    assert.ok(root.renderer.getPaintedText().includes("DeepSeek V4 Flash"))
    assert.ok(!root.renderer.getPaintedText().includes("Claude Opus 4.6"))
    await app.getByTestId("model-picker").click()
    assert.ok(root.renderer.getPaintedText().includes("Claude Opus 4.6"))
    await app.getByText("Claude Opus 4.6").click()
    assert.ok(root.renderer.getPaintedText().includes("Claude Opus 4.6"))
  } finally {
    await close(root, app)
  }
}

async function sendsComposerText(): Promise<void> {
  const root = mount()
  try {
    const textarea = requiredElement(root.renderer.findByType("textarea")[0], "composer textarea")
    root.renderer.nativeSimulateKeystrokes(textarea.id, "h e l l o")
    assert.ok(root.renderer.getPaintedText().includes("hello"))
    root.renderer.nativeSimulateKeystrokes(textarea.id, "enter")
    assert.ok(root.renderer.getPaintedText().includes("Do anything..."))
    const transcript = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript")
    root.renderer.scrollToItem(transcript.id, transcript.children.length - 1)
    root.renderer.flush()
    assert.ok(root.renderer.getPaintedText().includes("hello"))
  } finally {
    root.unmount()
  }
}

async function honorsTurnCount(): Promise<void> {
  const root = mount({ turnCount: 6 })
  try {
    const transcript = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript")
    assert.equal(transcript.children.length, 6)
  } finally {
    root.unmount()
  }
}

async function preservesRowsAcrossSidebarMotion(): Promise<void> {
  const root = mount({ turnCount: 80 })
  const app = createTestApp(root.renderer)
  try {
    const before = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript").children.slice()
    assert.equal(before.length, 80)
    const startedAt = await app.clock.pause()
    await app.getByTestId("sidebar-collapse").click()
    await app.clock.set(startedAt + 100)
    const during = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript").children
    assert.deepEqual(during, before)
    await app.clock.set(startedAt + 200)
    assert.equal(await app.getByTestId("sidebar-expand").count(), 1)
    await app.clock.resume()
  } finally {
    await close(root, app)
  }
}

async function keepsSafeMdxAsExtraRow(): Promise<void> {
  const root = mount({ turnCount: 6, includeSafeMdx: true })
  try {
    const transcript = requiredElement(root.renderer.findByType("virtual-list")[0], "chat transcript")
    assert.equal(transcript.children.length, 7)
    root.renderer.scrollToItem(transcript.id, 0)
    root.renderer.flush()
    assert.ok(root.renderer.getPaintedText().includes("Solid-composed Markdown"))
  } finally {
    root.unmount()
  }
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("chat parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const cases: Array<[string, () => Promise<void>]> = [
    ["composed MDX", rendersComposedMdx],
    ["narrow MDX wrap", wrapsNarrowMdxList],
    ["surface", rendersApplicationSurface],
    ["scroll", scrollsTranscript],
    ["selection", protectsSidebarSelection],
    ["model picker", changesModel],
    ["composer", sendsComposerText],
    ["turn count", honorsTurnCount],
    ["sidebar motion", preservesRowsAcrossSidebarMotion],
    ["safe MDX row", keepsSafeMdxAsExtraRow],
  ]

  for (const [name, test] of cases) {
    await test()
    console.log(`chat parity: ${name} passed`)
  }
  console.log("chat parity: passed")
}

await main()
