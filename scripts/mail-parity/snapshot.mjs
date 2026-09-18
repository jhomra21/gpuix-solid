const importantTestIds = [
  "search",
  "find-channel",
  "composer",
  "thread-full",
  "thread-close",
]
const semanticSurfaceIds = [
  "mail-app",
  "mail-sidebar",
  "mail-list-toolbar",
  "mail-thread-list",
  "mail-reading-toolbar",
  "mail-reading-pane",
  "thread-split",
]

function textOf(node) {
  return [node?.text ?? "", ...(node?.children ?? []).map(textOf)].join("")
}

function walk(node, visit) {
  if (!node) return
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function numericBounds(bounds) {
  if (!bounds) return null
  return {
    x: Number(bounds.x),
    y: Number(bounds.y),
    width: Number(bounds.width),
    height: Number(bounds.height),
  }
}

function normalizedLeafTexts(root) {
  const values = []
  walk(root, (node) => {
    const text = node.text ?? ""
    if ((node.children ?? []).length === 0 && text.trim()) {
      values.push(text.replace(/\s+/g, " ").trim())
    }
  })
  return values.sort()
}

function nodeEvents(node) {
  const candidates = [node.events, node.eventTypes, node.listeners, node.props?.events]
  return candidates.find((value) => value != null && Object.keys(value).length > 0) ?? null
}

function hasEvents(node) {
  const events = nodeEvents(node)
  return events != null && Object.keys(events).length > 0
}

function collectEventlessIconTargets(root) {
  const targets = []
  walk(root, (node) => {
    if (node.type !== "div" || hasEvents(node) || !node.bounds) return
    const hasSvgChild = (node.children ?? []).some((child) => child.type === "svg")
    if (hasSvgChild) targets.push({ id: node.id, text: textOf(node), bounds: numericBounds(node.bounds) })
  })
  return targets
}

async function scrollOffsets(adapter) {
  const offsets = {}
  for (const testId of ["mail-sidebar", "mail-thread-list", "mail-reading-pane"]) {
    const nodes = await adapter.app.getByTestId(testId).all()
    const node = nodes.length === 1 ? nodes[0] : null
    if (!node || node.syntheticSurface) continue
    try {
      offsets[testId] = await adapter.getScrollOffset(node.id)
    } catch {
      offsets[testId] = null
    }
  }
  return offsets
}

function simplify(root) {
  const result = []
  walk(root, (node) => {
    result.push({
      type: node.type,
      testId: node.testId ?? null,
      text: node.text ?? null,
      bounds: numericBounds(node.bounds),
      hasEvents: hasEvents(node),
    })
  })
  return result
}

export async function snapshotFromTree(adapter, root, label) {
  if (!root) throw new Error(adapter.kind + " returned an empty tree at " + label)
  const testIds = {}
  const typeCounts = {}
  const images = []
  const inputs = []
  walk(root, (node) => {
    typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1
    if (node.testId) {
      const entry = testIds[node.testId] ?? { count: 0, bounds: [] }
      entry.count += 1
      if (node.bounds) entry.bounds.push(numericBounds(node.bounds))
      testIds[node.testId] = entry
    }
    if (node.type === "img") images.push({ bounds: numericBounds(node.bounds), text: textOf(node) })
    if (node.type === "input" || node.type === "textarea") {
      inputs.push({
        type: node.type,
        text: textOf(node),
        value: node.value ?? node.props?.value ?? null,
        placeholder: node.placeholder ?? node.props?.placeholder ?? null,
        bounds: numericBounds(node.bounds),
      })
    }
  })
  return {
    label,
    kind: adapter.kind,
    visibleText: textOf(root).replace(/\s+/g, " ").trim(),
    leafTexts: normalizedLeafTexts(root),
    typeCounts,
    testIds,
    semanticSurfaces: Object.fromEntries(
      await Promise.all(
        semanticSurfaceIds.map(async (testId) => [testId, await adapter.app.getByTestId(testId).count()]),
      ),
    ),
    semanticSurfaceBounds: Object.fromEntries(
      await Promise.all(
        semanticSurfaceIds.map(async (testId) => {
          const nodes = await adapter.app.getByTestId(testId).all()
          if (nodes.length !== 1 || nodes[0].syntheticSurface) return [testId, null]
          return [testId, numericBounds(await adapter.app.getByTestId(testId).bounds())]
        }),
      ),
    ),
    inputs,
    images,
    scrollOffsets: await scrollOffsets(adapter),
    eventlessIconTargets: collectEventlessIconTargets(root),
    tree: simplify(root),
  }
}

export async function snapshot(adapter, label) {
  return snapshotFromTree(adapter, await adapter.tree(), label)
}

function compareValues(left, right, path, mismatches) {
  if (left === right) return
  if (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 8) return
  mismatches.push(path + ": " + JSON.stringify(left) + " != " + JSON.stringify(right))
}

function comparableLeafTexts(reactSnapshot, solidSnapshot, mismatches) {
  const react = [...reactSnapshot.leafTexts]
  const solid = [...solidSnapshot.leafTexts]
  const vectorMentionCount = solidSnapshot.testIds["mail-vector-mention-count"]?.count ?? 0

  for (let index = 0; index < vectorMentionCount; index += 1) {
    const mentionTextIndex = react.indexOf("1")
    if (mentionTextIndex < 0) {
      mismatches.push("vector mention count has no matching React text leaf")
      break
    }
    react.splice(mentionTextIndex, 1)
  }

  return { react, solid }
}

export function compareSnapshots(reactSnapshot, solidSnapshot) {
  const mismatches = []
  const comparableText = comparableLeafTexts(reactSnapshot, solidSnapshot, mismatches)
  if (comparableText.react.join("\u0000") !== comparableText.solid.join("\u0000")) {
    mismatches.push("leaf text differs")
  }
  for (const key of ["img", "input", "textarea"]) {
    compareExact(
      reactSnapshot.typeCounts[key] ?? 0,
      solidSnapshot.typeCounts[key] ?? 0,
      "typeCounts." + key,
      mismatches,
    )
  }
  for (const key of semanticSurfaceIds) {
    compareExact(
      reactSnapshot.semanticSurfaces[key] ?? 0,
      solidSnapshot.semanticSurfaces[key] ?? 0,
      "semanticSurfaces." + key,
      mismatches,
    )
  }
  for (const testId of importantTestIds) {
    compareExact(
      reactSnapshot.testIds[testId]?.count ?? 0,
      solidSnapshot.testIds[testId]?.count ?? 0,
      "testIds." + testId + ".count",
      mismatches,
    )
    const leftBounds = reactSnapshot.testIds[testId]?.bounds?.[0]
    const rightBounds = solidSnapshot.testIds[testId]?.bounds?.[0]
    if (leftBounds && rightBounds) compareBounds(leftBounds, rightBounds, "testIds." + testId + ".bounds", mismatches)
  }
  for (const testId of semanticSurfaceIds) {
    const leftBounds = reactSnapshot.semanticSurfaceBounds[testId]
    const rightBounds = solidSnapshot.semanticSurfaceBounds[testId]
    if (leftBounds && rightBounds) compareBounds(leftBounds, rightBounds, "semanticSurfaceBounds." + testId, mismatches)
  }
  if (reactSnapshot.inputs.length !== solidSnapshot.inputs.length) {
    mismatches.push("input surface count differs")
  }
  if (reactSnapshot.images.length !== solidSnapshot.images.length) {
    mismatches.push("image surface count differs")
  }
  for (const testId of ["mail-sidebar", "mail-thread-list", "mail-reading-pane"]) {
    const left = reactSnapshot.scrollOffsets[testId]
    const right = solidSnapshot.scrollOffsets[testId]
    if (left != null && right != null) {
      compareValues(left.x, right.x, "scroll." + testId + ".x", mismatches)
      compareValues(left.y, right.y, "scroll." + testId + ".y", mismatches)
    }
  }
  return mismatches
}

function compareBounds(left, right, path, mismatches) {
  for (const key of ["x", "y", "width", "height"]) {
    compareValues(left[key], right[key], path + "." + key, mismatches)
  }
}

function compareExact(left, right, path, mismatches) {
  if (left !== right) mismatches.push(path + ": " + JSON.stringify(left) + " != " + JSON.stringify(right))
}

export { importantTestIds }
