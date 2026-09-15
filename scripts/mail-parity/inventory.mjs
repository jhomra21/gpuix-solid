import { readFileSync } from "node:fs"

function lineOf(source, needle) {
  const index = source.indexOf(needle)
  return index < 0 ? null : source.slice(0, index).split("\n").length
}

function evidence(source, needle) {
  const line = lineOf(source, needle)
  return line == null ? "not found" : "L" + line
}

export function buildInventory(source) {
  const rows = [
    ["Mail shell and three-pane layout", "FUNCTIONAL, VISUAL", "mail-app, mail-sidebar, mail-thread-list, mail-reading-pane", "initial mount; pane visibility follows threadPane", "export function MailApp"],
    ["Six-channel tree and channel search", "FUNCTIONAL, INPUT, NAVIGATION", "channel-* and find-channel", "channel filtering and active-channel selection", "channel-"],
    ["Sidebar thread tree", "FUNCTIONAL, NAVIGATION, CONDITIONAL", "nav-thread-*", "opens a full reader from the sidebar", "nav-thread-"],
    ["Timeline thread list", "FUNCTIONAL, NAVIGATION, CONDITIONAL", "thread-*", "membership and selected styling follow visibleThreads", "function TimelineRow"],
    ["Sender/subject/snippet search", "FUNCTIONAL, INPUT, CONDITIONAL", "search", "query filters sender, subject, and snippet; empty/no-result states", "SearchField"],
    ["Reader mode controls", "FUNCTIONAL, CONDITIONAL", "thread-full, thread-split, thread-close", "closed, split, and full modes change list/toolbar visibility", "threadPane"],
    ["Direct-message reader", "FUNCTIONAL, VISUAL, IMAGE/MEDIA", "mail-reading-pane", "single-face header and message body", "DirectHeader"],
    ["Newsletter reader", "FUNCTIONAL, VISUAL, IMAGE/MEDIA", "mail-reading-pane", "multi-face header, newsletter artwork, and banner", "Atlas Weekly"],
    ["Composer", "FUNCTIONAL, INPUT", "composer", "native text input accepts replacement typing", "Ask anything"],
    ["Composer action icons", "VISUAL/INERT BY UPSTREAM DESIGN, HOVER/PRESSED VISUAL", "none", "IconButtons have no onClick in the source", "icon=\"at\""],
    ["List toolbar navigation/filter/sort icons", "VISUAL/INERT BY UPSTREAM DESIGN, HOVER/PRESSED VISUAL", "none", "IconButtons have no onClick in the source", "icon=\"filter\""],
    ["Reader toolbar actions", "VISUAL/INERT BY UPSTREAM DESIGN, HOVER/PRESSED VISUAL", "none", "snooze, zap, archive, star, clock, block, trash, more are inert upstream", "icon=\"snooze\""],
    ["HTTP avatars and newsletter images", "IMAGE/MEDIA, VISUAL", "img descendants", "remote URLs, face stacks, cropping and four newsletter images", "http"],
    ["Independent scrolling", "SCROLLABLE", "mail-sidebar, mail-thread-list, mail-reading-pane", "each pane owns its scroll surface", "overflowY"],
    ["Real text selection", "FUNCTIONAL, INPUT", "message text", "native drag/release followed by a composer action", "userSelect"],
    ["Hover and pressed states", "HOVER/PRESSED VISUAL", "interactive rows and IconButtons", "source hover/active styles are observable without inventing behavior", "hover"],
  ]

  const testIds = source.split("\n").flatMap((line, index) => {
    const match = line.match(/testId=([^\s]+)/)
    return match ? [{ id: match[1].replace(/[,>]$/, ""), line: index + 1 }] : []
  })
  const iconCalls = source.split("\n").flatMap((line, index) => {
    const match = line.match(/<IconButton\s+icon="([^"]+)"/)
    return match ? [{ icon: match[1], line: index + 1, inert: !line.includes("onClick=") }] : []
  })
  const conditionals = source
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => /threadPane|visibleThreads|selectedThread|query|channelQuery|faces\.length|value \?/.test(text))
    .slice(0, 40)

  return {
    rows: rows.map(([surface, classification, selectors, behavior, sourceMarker]) => ({
      surface,
      classification,
      selectors,
      behavior,
      evidence: evidence(source, sourceMarker),
    })),
    testIds,
    iconCalls,
    conditionals,
  }
}

export function inventoryFromFile(path) {
  return buildInventory(readFileSync(path, "utf8"))
}

export function renderInventoryMarkdown(inventory) {
  const lines = [
    "## Source-derived surface inventory",
    "",
    "| Surface | Classification | Observable selectors | Expected behavior | Source |",
    "| --- | --- | --- | --- | --- |",
  ]
  for (const row of inventory.rows) {
    lines.push(
      "| " +
        row.surface +
        " | " +
        row.classification +
        " | " +
        row.selectors +
        " | " +
        row.behavior +
        " | " +
        row.evidence +
        " |",
    )
  }
  lines.push("", "### Test IDs found in the exact React source", "")
  lines.push("| Test ID | Source line |", "| --- | --- |")
  for (const row of inventory.testIds) lines.push("| " + row.id + " | " + row.line + " |")
  lines.push("", "### IconButton inventory", "")
  lines.push("| Icon | Source line | Has source onClick |", "| --- | --- | --- |")
  for (const row of inventory.iconCalls) lines.push("| " + row.icon + " | " + row.line + " | " + (!row.inert ? "yes" : "no") + " |")
  lines.push("", "The icon rows with no source onClick are intentionally inert and are covered by the parity scenario.")
  lines.push("", "### Conditional state evidence", "")
  lines.push("| Source line | Exact source expression |", "| --- | --- |")
  for (const row of inventory.conditionals) {
    lines.push("| L" + row.line + " | " + row.text.replace(/\|/g, "\\|") + " |")
  }
  return lines.join("\n")
}
