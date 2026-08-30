import assert from "node:assert/strict"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type TestElement,
  type TestRoot,
} from "gpuix-solid"
import { InfiniteChatApp, createFakeMessageApi, type MessageApi } from "./app"

const WIDTH = 920
const HEIGHT = 760

interface MountedInfiniteChat {
  root: TestRoot
  app: App
}

function mount(api: MessageApi): MountedInfiniteChat {
  const root = createTestRoot(WIDTH, HEIGHT)
  root.render(() => <InfiniteChatApp api={api} />)
  return { root, app: createTestApp(root.renderer) }
}

async function close(root: TestRoot, app: App): Promise<void> {
  await app.close()
  root.unmount()
}

function requiredElement(element: TestElement | undefined, label: string): TestElement {
  if (!element) throw new Error(`Missing ${label}`)
  return element
}

async function settle(root: TestRoot, turns = 4): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2))
    root.renderer.dispatchNativeEvents()
    root.renderer.flush()
  }
}

async function loadPrevious(root: TestRoot, api: MessageApi): Promise<void> {
  const list = requiredElement(root.renderer.findByType("virtual-list")[0], "infinite transcript")
  const before = api.requests.length
  root.renderer.scrollToItem(list.id, 0)
  root.renderer.dispatchNativeEvents()
  await settle(root)
  assert.equal(api.requests.length, before + 1)
  assert.equal(api.requests.at(-1)?.direction, "previous")
}

async function startsAtLatestWithoutPrefetch(): Promise<void> {
  const api = createFakeMessageApi({ messageCount: 40, pageSize: 6, delayMs: 1 })
  const { root, app } = mount(api)
  try {
    const list = requiredElement(root.renderer.findByType("virtual-list")[0], "infinite transcript")
    assert.equal(list.children.length, 7)
    assert.equal(api.requests.length, 0)
    assert.equal(await app.getByTestId("edge-previous").count(), 1)
    assert.equal(await app.getByTestId("edge-next").count(), 0)
    assert.equal(await app.getByTestId("message-message-034").count(), 1)
    assert.equal(await app.getByTestId("message-message-039").count(), 1)
  } finally {
    await close(root, app)
  }
}

async function fetchesOnlyAtTheTopEdge(): Promise<void> {
  const api = createFakeMessageApi({ messageCount: 40, pageSize: 6, delayMs: 1 })
  const { root, app } = mount(api)
  try {
    const list = requiredElement(root.renderer.findByType("virtual-list")[0], "infinite transcript")
    root.renderer.scrollToItem(list.id, 3)
    root.renderer.dispatchNativeEvents()
    await settle(root)
    assert.equal(api.requests.length, 0)

    await loadPrevious(root, api)
    assert.equal(await app.getByTestId("message-message-028").count(), 1)
    assert.equal(await app.getByTestId("message-message-033").count(), 1)
    assert.equal(await app.getByTestId("message-message-039").count(), 1)
  } finally {
    await close(root, app)
  }
}

async function evictsTheFarPageAfterFivePages(): Promise<void> {
  const api = createFakeMessageApi({ messageCount: 60, pageSize: 6, delayMs: 1 })
  const { root, app } = mount(api)
  try {
    for (let index = 0; index < 5; index += 1) await loadPrevious(root, api)
    assert.equal(api.requests.length, 5)
    assert.equal(await app.getByTestId("message-message-024").count(), 1)
    assert.equal(await app.getByTestId("message-message-053").count(), 1)
    assert.equal(await app.getByTestId("message-message-054").count(), 0)
    assert.equal(await app.getByTestId("message-message-059").count(), 0)
    const list = requiredElement(root.renderer.findByType("virtual-list")[0], "infinite transcript")
    assert.equal(list.children.length, 31)
  } finally {
    await close(root, app)
  }
}

async function navigatesThroughComposedMdxLinks(): Promise<void> {
  const api = createFakeMessageApi({ messageCount: 40, pageSize: 6, delayMs: 1 })
  const { root, app } = mount(api)
  try {
    const list = requiredElement(root.renderer.findByType("virtual-list")[0], "infinite transcript")
    root.renderer.scrollToItem(list.id, 1)
    root.renderer.flush()
    assert.equal(await app.getByText("Open message 011").count(), 1)
    await app.getByText("Open message 011").click()
    await settle(root)
    assert.ok(api.requests.some((request) =>
      request.direction === "around" && request.cursor === "message-011",
    ))
    assert.equal(await app.getByText("/messages/message-011").count(), 1)
    assert.equal(await app.getByTestId("message-message-011").count(), 1)
  } finally {
    await close(root, app)
  }
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("infinite chat parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const cases: Array<[string, () => Promise<void>]> = [
    ["latest page", startsAtLatestWithoutPrefetch],
    ["edge fetch", fetchesOnlyAtTheTopEdge],
    ["bounded cache", evictsTheFarPageAfterFivePages],
    ["MDX navigation", navigatesThroughComposedMdxLinks],
  ]

  for (const [name, test] of cases) {
    await test()
    console.log(`infinite chat parity: ${name} passed`)
  }
  console.log("infinite chat parity: passed")
}

await main()
