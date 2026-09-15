const channels = [
  { id: "primary", threads: ["nora", "jules", "kenji", "atlas-weekly", "lea-july"] },
  { id: "promotions", threads: ["lighthouse", "welcome"] },
  { id: "social", threads: ["invite"] },
  { id: "updates", threads: ["year-review", "lea-30", "lea-29", "beta"] },
  { id: "forums", threads: ["harbor", "parts"] },
  { id: "notifications", threads: ["invoice", "sites", "security"] },
]

const scenarios = [
  {
    id: "01-initial",
    run: async (adapter, context) => {
      await present(adapter, "mail-app")
      await present(adapter, "mail-sidebar")
      await present(adapter, "mail-list-toolbar")
      await present(adapter, "mail-thread-list")
      await present(adapter, "mail-reading-toolbar")
      await present(adapter, "mail-reading-pane")
      await presentText(adapter, "Atlas Weekly")
      await expectCount(adapter.app.getByTestId("mail-reading-pane").getByType("img"), 4, "newsletter images")
      await delay(500)
      await checkpoint(adapter, context, "01-initial")
    },
  },
  {
    id: "02-channel-filter",
    run: async (adapter, context) => {
      const filter = adapter.app.getByTestId("find-channel")
      await filter.fill("promo")
      await present(adapter, "channel-promotions")
      await absent(adapter, "channel-primary")
      await absent(adapter, "channel-notifications")
      await checkpoint(adapter, context, "02-channel-filter")
      await filter.fill("")
      for (const channel of channels) await present(adapter, "channel-" + channel.id)
    },
  },
  {
    id: "03-search-results",
    run: async (adapter, context) => {
      const search = adapter.app.getByTestId("search")
      await search.fill("Nora")
      await present(adapter, "thread-nora")
      await absent(adapter, "thread-atlas-weekly")
      await search.fill("Desk notes")
      await present(adapter, "thread-nora")
      await search.fill("shared folder")
      await present(adapter, "thread-nora")
      await search.fill("no such thread")
      await absent(adapter, "thread-nora")
      await checkpoint(adapter, context, "03-search-results")
      await search.fill("")
      await present(adapter, "thread-atlas-weekly")
    },
  },
  {
    id: "04-direct-message-reader",
    run: async (adapter, context) => {
      await adapter.app.getByTestId("thread-nora").click()
      await presentText(adapter, "Desk notes")
      await presentText(adapter, "Nora")
      await checkpoint(adapter, context, "04-direct-message-reader")
    },
  },
  {
    id: "05-newsletter-reader",
    run: async (adapter, context) => {
      await restoreSplit(adapter)
      await adapter.app.getByTestId("thread-atlas-weekly").click()
      await expectCount(adapter.app.getByTestId("mail-reading-pane").getByType("img"), 4, "newsletter images")
      await presentText(adapter, "Atlas Weekly")
      await checkpoint(adapter, context, "05-newsletter-reader")
    },
  },
  {
    id: "06-composer-typed",
    run: async (adapter, context) => {
      const composer = adapter.app.getByTestId("composer")
      await composer.fill("Mail parity draft")
      await composer.fill("Replaced draft")
      await checkpoint(adapter, context, "06-composer-typed")
      await composer.fill("")
    },
  },
  {
    id: "07-reader-full",
    run: async (adapter, context) => {
      await restoreSplit(adapter)
      await adapter.app.getByTestId("thread-atlas-weekly").click()
      await adapter.app.getByTestId("thread-full").click()
      await absent(adapter, "mail-thread-list")
      await absent(adapter, "mail-list-toolbar")
      await present(adapter, "thread-split")
      await checkpoint(adapter, context, "07-reader-full")
      await adapter.app.getByTestId("thread-split").click()
      await present(adapter, "mail-thread-list")
    },
  },
  {
    id: "08-reader-closed",
    run: async (adapter, context) => {
      await adapter.app.getByTestId("thread-close").click()
      await absent(adapter, "mail-reading-pane")
      await absent(adapter, "mail-reading-toolbar")
      await present(adapter, "mail-thread-list")
      await checkpoint(adapter, context, "08-reader-closed")
      await restoreSplit(adapter)
    },
  },
  {
    id: "09-sidebar-full-reader",
    run: async (adapter, context) => {
      await adapter.app.getByTestId("nav-thread-atlas-weekly").click()
      await absent(adapter, "mail-thread-list")
      await present(adapter, "thread-split")
      await checkpoint(adapter, context, "09-sidebar-full-reader")
      await adapter.app.getByTestId("thread-split").click()
      await present(adapter, "mail-thread-list")
    },
  },
  {
    id: "10-scrolled-newsletter",
    run: async (adapter, context) => {
      await restoreSplit(adapter)
      await adapter.app.getByTestId("thread-atlas-weekly").click()
      await adapter.app.getByTestId("mail-sidebar").wheel(0, -240)
      await adapter.app.getByTestId("mail-thread-list").wheel(0, -180)
      await adapter.app.getByTestId("mail-reading-pane").wheel(0, -260)
      await checkpoint(adapter, context, "10-scrolled-newsletter")
    },
  },
  {
    id: "11-selection-released",
    run: async (adapter, context) => {
      await restoreSplit(adapter)
      await adapter.app.getByTestId("thread-atlas-weekly").click()
      const message = adapter.app.getByText("Lea sent the weekly recap")
      const bounds = await message.bounds()
      const start = { x: bounds.x + Math.min(12, Math.max(2, bounds.width / 8)), y: bounds.y + Math.min(10, Math.max(2, bounds.height / 2)) }
      const end = { x: Math.min(bounds.x + bounds.width - 4, start.x + 160), y: start.y }
      await adapter.app.mouse.drag(start, end, { steps: 12 })
      await adapter.app.getByTestId("composer").fill("after selection")
      await checkpoint(adapter, context, "11-selection-released")
      await adapter.app.getByTestId("composer").fill("")
    },
  },
  {
    id: "12-all-threads",
    run: async (adapter, context) => {
      for (const channel of channels) {
        await selectChannelAndWait(adapter, channel)
        for (const threadId of channel.threads) {
          await openThreadAndWait(adapter, threadId)
        }
      }
      await restoreSplit(adapter)
      await checkpoint(adapter, context, "12-all-threads")
    },
  },
  {
    id: "13-hover-controls",
    run: async (adapter, context) => {
      for (const channel of channels) {
        const control = await sidebarControl(adapter, "channel-" + channel.id, `hover channel ${channel.id}`)
        await control.hover()
      }
      for (const channel of channels) {
        await selectChannelAndWait(adapter, channel)
        for (const threadId of channel.threads) {
          await present(adapter, "thread-" + threadId, `hover thread ${channel.id}/${threadId}`)
          await adapter.app.getByTestId("thread-" + threadId).hover()
        }
      }
      await restoreSplit(adapter)
      await adapter.app.getByTestId("search").hover()
      await adapter.app.getByTestId("composer").hover()
      await checkpoint(adapter, context, "13-hover-controls")
    },
  },
  {
    id: "14-inert-icons",
    run: async (adapter, context) => {
      const before = await adapter.tree()
      const targets = (await adapter.snapshot(before)).eventlessIconTargets.slice(0, 14)
      for (const target of targets) {
        const bounds = target.bounds
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue
        await adapter.app.mouse.click({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        })
      }
      const after = await adapter.tree()
      const beforeSnapshot = await adapter.snapshot(before)
      const afterSnapshot = await adapter.snapshot(after)
      const stateChanges = compareStableState(beforeSnapshot, afterSnapshot)
      if (stateChanges.length > 0) {
        throw new Error("inert icon clicks changed state: " + stateChanges.join("; "))
      }
      await checkpoint(adapter, context, "14-inert-icons")
    },
  },
]

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function expectCount(locator, expected, label) {
  const deadline = Date.now() + 5_000
  let actual = -1
  for (;;) {
    actual = await locator.count()
    if (actual === expected) return
    if (Date.now() >= deadline) throw new Error(label + " expected " + expected + ", got " + actual)
    await delay(25)
  }
}

async function present(adapter, testId, label = "present " + testId) {
  await expectCount(adapter.app.getByTestId(testId), 1, label)
}

async function absent(adapter, testId, label = "absent " + testId) {
  await expectCount(adapter.app.getByTestId(testId), 0, label)
}

async function presentText(adapter, text) {
  const locator = adapter.app.getByText(text)
  const deadline = Date.now() + 5_000
  for (;;) {
    if ((await locator.count()) >= 1) return
    if (Date.now() >= deadline) throw new Error("text " + text + " was not present")
    await delay(25)
  }
}

async function differentText(locator, before, label) {
  const deadline = Date.now() + 5_000
  let actual = before
  for (;;) {
    actual = await locator.textContent()
    if (actual !== before) return
    if (Date.now() >= deadline) throw new Error(label + " did not change reader text")
    await delay(25)
  }
}

async function sidebarControl(adapter, testId, label) {
  const sidebar = adapter.app.getByTestId("mail-sidebar")
  const filter = adapter.app.getByTestId("find-channel")
  const control = adapter.app.getByTestId(testId)
  await expectCount(control, 1, label)

  const sidebarBounds = await sidebar.bounds()
  const filterBounds = await filter.bounds()
  const minY = filterBounds.y + filterBounds.height + 2
  const maxY = sidebarBounds.y + sidebarBounds.height - 48
  const deadline = Date.now() + 5_000
  let bounds = await control.bounds()

  for (;;) {
    const centerY = bounds.y + bounds.height / 2
    if (centerY >= minY && centerY <= maxY) return control
    if (Date.now() >= deadline) {
      throw new Error(
        label +
          " stayed outside the sidebar viewport: centerY=" +
          centerY +
          ", visibleY=" +
          minY +
          ".." +
          maxY,
      )
    }
    await sidebar.wheel(0, centerY < minY ? 180 : -180)
    await delay(25)
    bounds = await control.bounds()
  }
}

async function selectChannelAndWait(adapter, channel) {
  const channelId = channel.id
  const control = await sidebarControl(adapter, "channel-" + channelId, `channel ${channelId} control`)
  await control.click()
  await present(adapter, "mail-thread-list", `${channelId} thread list`)
  await absent(adapter, "mail-reading-pane", `${channelId} reader closed`)
  await absent(adapter, "mail-reading-toolbar", `${channelId} reader toolbar closed`)
  for (const threadId of channel.threads) {
    await present(adapter, "thread-" + threadId, `${channelId}/${threadId} timeline row`)
  }
  const outside = channels.find((candidate) => candidate.id !== channelId)?.threads[0]
  if (outside) await absent(adapter, "thread-" + outside, `${channelId} excludes ${outside}`)
}

async function openThreadAndWait(adapter, threadId) {
  const pane = adapter.app.getByTestId("mail-reading-pane")
  const before = (await pane.count()) ? await pane.textContent() : null
  await present(adapter, "thread-" + threadId, `thread ${threadId} before open`)
  await adapter.app.getByTestId("thread-" + threadId).click()
  await present(adapter, "mail-reading-pane", `${threadId} reading pane`)
  await present(adapter, "mail-reading-toolbar", `${threadId} reading toolbar`)
  await present(adapter, "composer", `${threadId} composer`)
  await present(adapter, "mail-thread-list", `${threadId} keeps split list`)
  if (before !== null) await differentText(pane, before, `thread ${threadId}`)
}

async function restoreSplit(adapter) {
  const primary = channels[0]
  await selectChannelAndWait(adapter, primary)
  await openThreadAndWait(adapter, "atlas-weekly")
}

async function checkpoint(adapter, context, id) {
  const path = context.artifactDir + "/" + id + ".png"
  await adapter.screenshot(path)
  const snap = await adapter.snapshotNow(id)
  context.snapshots.push(snap)
}

function compareStableState(left, right) {
  const differences = []
  if (left.visibleText !== right.visibleText) differences.push("visible text")
  if (JSON.stringify(left.testIds) !== JSON.stringify(right.testIds)) differences.push("test IDs")
  if (JSON.stringify(left.inputs) !== JSON.stringify(right.inputs)) differences.push("inputs")
  if (left.images.length !== right.images.length) differences.push("images")
  return differences
}

export async function runScenarioSuite(adapter, artifactDir) {
  const context = { artifactDir, snapshots: [] }
  for (const scenario of scenarios) {
    const started = Date.now()
    await scenario.run(adapter, context)
    context.results ??= []
    context.results.push({ id: scenario.id, durationMs: Date.now() - started })
  }
  return context
}

export { channels, scenarios }
