import { spawn } from "node:child_process"
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../../../packages/solid/dist/automation/stdio.js"

const here = dirname(fileURLToPath(import.meta.url))
const exampleDirectory = join(here, "..")
const timeoutMs = 20_000
const rpcTimeoutMs = 5_000
const performancePath = "/tmp/diffusion-performance.json"
const targetFps = 120
const targetFrameMs = 1000 / targetFps
const maxGpuixViewRenderP90Ms = 1
const maxGpuixViewBuildP90Ms = 0.15
const enforce120HzBudget = process.env.GPUIX_ENFORCE_120HZ === "1"
const performanceReport = {
  targetFps,
  targetFrameMs,
  maxGpuixViewRenderP90Ms,
  maxGpuixViewBuildP90Ms,
  enforce120HzBudget,
  scenarios: {},
}
const screenshots = {
  initial: "/tmp/diffusion-editor-initial.png",
  layerInspector: "/tmp/diffusion-layer-inspector.png",
  inspectorScrolled: "/tmp/diffusion-inspector-scrolled.png",
  rectangle: "/tmp/diffusion-rectangle-drawn.png",
  rectangleMoved: "/tmp/diffusion-rectangle-moved.png",
  rectangleResized: "/tmp/diffusion-rectangle-resized.png",
  aiPrompt: "/tmp/diffusion-ai-prompt.png",
  textEdit: "/tmp/diffusion-text-edit.png",
  timeline: "/tmp/diffusion-timeline-interaction.png",
  timelineScrolled: "/tmp/diffusion-timeline-scrolled.png",
  scenePresetPanel: "/tmp/diffusion-scene-preset-panel.png",
  scenePreset: "/tmp/diffusion-scene-preset.png",
  projectMenu: "/tmp/diffusion-project-dropdown.png",
  projectViewSubmenu: "/tmp/diffusion-project-view-submenu.png",
  projectZoomed: "/tmp/diffusion-project-zoomed.png",
  canvasZoomed: "/tmp/diffusion-canvas-wheel-zoomed.png",
  zoomMenu: "/tmp/diffusion-zoom-dropdown.png",
  moveHandMenu: "/tmp/diffusion-move-hand-dropdown.png",
  assetsMenu: "/tmp/diffusion-assets-dropdown.png",
  chatMarkdown: "/tmp/diffusion-chat-markdown.png",
  chat: "/tmp/diffusion-chat.png",
  contextMenu: "/tmp/diffusion-context-menu.png",
  hiddenUi: "/tmp/diffusion-hidden-ui.png",
  final: "/tmp/gpuix-solid1-diffusion-live-automation.png",
}
const fatalPatterns = [
  /cannot update .*GpuixView/i,
  /already being updated/i,
  /fatal runtime error/i,
  /failed to initiate panic/i,
  /SIGABRT/i,
  /thread .* panicked/i,
  /DOM content must be inside <html>/i,
  /ctx\.getTransform is not a function/i,
  /Unsupported numeric inline style/i,
  /GPUix Canvas2D .*fillText/i,
  /uncaught.*solid/i,
]

function matchingDiagnostics(output) {
  const signatures = [
    /cannot update .*GpuixView/gi,
    /already being updated/gi,
    /fatal runtime error/gi,
    /failed to initiate panic/gi,
    /SIGABRT/gi,
    /thread .* panicked/gi,
    /DOM content must be inside <html>/gi,
    /ctx\.getTransform is not a function/gi,
    /Unsupported numeric inline style[^\r\n]*/gi,
    /GPUix Canvas2D [^\r\n]*fillText[^\r\n]*/gi,
    /(?:TypeError|ReferenceError):[^\r\n]*/gi,
  ]
  const matches = []
  for (const signature of signatures) {
    for (const match of output.matchAll(signature)) {
      matches.push(output.slice(Math.max(0, match.index - 100), match.index + match[0].length + 120))
    }
  }
  return [...new Set(matches)]
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function descendants(node) {
  if (!node) return []
  return [node, ...(node.children ?? []).flatMap(descendants)]
}

function comparableAutomationNode(node) {
  return {
    type: node.type,
    text: node.text ?? null,
    testId: node.testId ?? null,
    style: node.style ?? null,
    events: node.events ?? null,
    customProps: node.customProps ?? null,
    bounds: node.bounds ?? null,
  }
}

function diffAutomationTrees(before, after) {
  const beforeNodes = new Map(descendants(before).map((node) => [node.id, node]))
  const afterNodes = new Map(descendants(after).map((node) => [node.id, node]))
  const ids = new Set([...beforeNodes.keys(), ...afterNodes.keys()])
  const changed = []

  for (const id of ids) {
    const previous = beforeNodes.get(id)
    const next = afterNodes.get(id)
    if (!previous || !next) {
      changed.push({
        id,
        kind: previous ? "removed" : "added",
        type: (next ?? previous)?.type ?? null,
        text: (next ?? previous)?.text ?? null,
        testId: (next ?? previous)?.testId ?? null,
      })
      continue
    }

    const previousComparable = comparableAutomationNode(previous)
    const nextComparable = comparableAutomationNode(next)
    if (JSON.stringify(previousComparable) === JSON.stringify(nextComparable)) continue

    const fields = Object.keys(previousComparable).filter(
      (key) => JSON.stringify(previousComparable[key]) !== JSON.stringify(nextComparable[key]),
    )
    changed.push({
      id,
      kind: "changed",
      type: next.type,
      text: next.text ?? null,
      testId: next.testId ?? null,
      fields,
      before: previousComparable,
      after: nextComparable,
    })
  }

  return changed
}

function indexParents(root) {
  const parents = new Map()
  const visit = (node) => {
    for (const child of node.children ?? []) {
      parents.set(child.id, node)
      visit(child)
    }
  }
  if (root) visit(root)
  return parents
}

function textContent(node) {
  return `${node.text ?? ""}${(node.children ?? []).map(textContent).join("")}`
}

function findNode(root, predicate, label) {
  const found = descendants(root).find(predicate)
  assert(found, `Could not find ${label}`)
  return found
}

function findText(root, text, { exact = true } = {}) {
  return findNode(
    root,
    (node) => node.type === "text" && (exact ? node.text === text : (node.text ?? "").includes(text)),
    `text ${JSON.stringify(text)}`,
  )
}

function paintedRowAncestor(root, node, {
  minWidth = 100,
  minHeight = 24,
  maxHeight = 40,
} = {}) {
  const parents = indexParents(root)
  let current = parents.get(node.id)
  while (current) {
    const bounds = current.bounds
    if (
      bounds &&
      bounds.width >= minWidth &&
      bounds.height >= minHeight &&
      bounds.height <= maxHeight
    ) return current
    current = parents.get(current.id)
  }
  return undefined
}

function findBounds(node, app) {
  if (node.bounds) return Promise.resolve(node.bounds)
  return app.backend.getBounds(node.id)
}

async function waitFor(label, read, timeout = timeoutMs) {
  const start = Date.now()
  let lastError
  while (Date.now() - start < timeout) {
    try {
      const value = await read()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await delay(40)
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ""}`)
}

async function currentTree(app) {
  return await app.backend.getTree()
}

async function physicalClick(app, point, button = 0) {
  await app.mouse.move(point)
  await delay(45)
  await app.mouse.down(point, { button })
  await delay(65)
  await app.mouse.up(point, { button })
  await delay(180)
}

async function clickNode(app, node, button = 0) {
  const bounds = await findBounds(node, app)
  assert(bounds && bounds.width > 0 && bounds.height > 0, `Node ${node.id} has no clickable bounds`)
  await physicalClick(app, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }, button)
}

async function drag(app, from, to, steps = 10) {
  await app.mouse.drag(from, to, { steps })
  await delay(240)
}

async function screenshot(app, name) {
  const path = screenshots[name]
  await app.screenshot({ path })
  assert(existsSync(path) && statSync(path).size > 10_000, `Screenshot ${path} was not captured correctly`)
  return path
}

function persistPerformanceReport() {
  writeFileSync(performancePath, `${JSON.stringify(performanceReport, null, 2)}\n`)
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function summarizeProfiles(name, runNames) {
  const runs = runNames.map((runName) => performanceReport.scenarios[runName])
  const summary = {
    status: runs.every((run) => run?.status === "passed") ? "passed" : "failed",
    runs: runNames,
    p90Ms: median(runs.map((run) => run?.p90Ms)),
    p99Ms: median(runs.map((run) => run?.p99Ms)),
    maxMs: median(runs.map((run) => run?.maxMs)),
    drawRootsP90Ms: median(runs.map((run) => run?.drawRootsP90Ms)),
    drawRootsP99Ms: median(runs.map((run) => run?.drawRootsP99Ms)),
    drawRootsMaxMs: median(runs.map((run) => run?.drawRootsMaxMs)),
    prepaintP90Ms: median(runs.map((run) => run?.prepaintP90Ms)),
    prepaintP99Ms: median(runs.map((run) => run?.prepaintP99Ms)),
    prepaintMaxMs: median(runs.map((run) => run?.prepaintMaxMs)),
    paintP90Ms: median(runs.map((run) => run?.paintP90Ms)),
    paintP99Ms: median(runs.map((run) => run?.paintP99Ms)),
    paintMaxMs: median(runs.map((run) => run?.paintMaxMs)),
    rootRequestP90Ms: median(runs.map((run) => run?.rootRequestP90Ms)),
    rootRequestP99Ms: median(runs.map((run) => run?.rootRequestP99Ms)),
    rootLayoutP90Ms: median(runs.map((run) => run?.rootLayoutP90Ms)),
    rootLayoutP99Ms: median(runs.map((run) => run?.rootLayoutP99Ms)),
    rootPrepaintP90Ms: median(runs.map((run) => run?.rootPrepaintP90Ms)),
    rootPrepaintP99Ms: median(runs.map((run) => run?.rootPrepaintP99Ms)),
    prepaintRestP90Ms: median(runs.map((run) => run?.prepaintRestP90Ms)),
    prepaintRestP99Ms: median(runs.map((run) => run?.prepaintRestP99Ms)),
    cachedPrepaintReuseP90Ms: median(runs.map((run) => run?.cachedPrepaintReuseP90Ms)),
    cachedPrepaintReuseP99Ms: median(runs.map((run) => run?.cachedPrepaintReuseP99Ms)),
    cachedPrepaintRenderP90Ms: median(runs.map((run) => run?.cachedPrepaintRenderP90Ms)),
    cachedPrepaintRenderP99Ms: median(runs.map((run) => run?.cachedPrepaintRenderP99Ms)),
    cachedPrepaintHits: median(runs.map((run) => run?.cachedPrepaintHits)),
    cachedPrepaintMisses: median(runs.map((run) => run?.cachedPrepaintMisses)),
    cachedPrepaintColdMisses: median(runs.map((run) => run?.cachedPrepaintColdMisses)),
    cachedPrepaintKeyMisses: median(runs.map((run) => run?.cachedPrepaintKeyMisses)),
    cachedPrepaintDirtyMisses: median(runs.map((run) => run?.cachedPrepaintDirtyMisses)),
    cachedPrepaintRefreshingMisses: median(runs.map((run) => run?.cachedPrepaintRefreshingMisses)),
    canvasPrepareP90Ms: median(runs.map((run) => run?.canvasPrepareP90Ms)),
    canvasPrepareP99Ms: median(runs.map((run) => run?.canvasPrepareP99Ms)),
    canvasPrepareMaxMs: median(runs.map((run) => run?.canvasPrepareMaxMs)),
    viewRenderP90Ms: median(runs.map((run) => run?.viewRenderP90Ms)),
    viewRenderP99Ms: median(runs.map((run) => run?.viewRenderP99Ms)),
    viewRenderMaxMs: median(runs.map((run) => run?.viewRenderMaxMs)),
    viewBuildP90Ms: median(runs.map((run) => run?.viewBuildP90Ms)),
    viewBuildP99Ms: median(runs.map((run) => run?.viewBuildP99Ms)),
    viewBuildMaxMs: median(runs.map((run) => run?.viewBuildMaxMs)),
    observedFps: median(runs.map((run) => run?.observedFps)),
    rootRevisionDelta: median(runs.map((run) => run?.rootRevisionDelta)),
  }
  summary.meets120HzP90Budget = summary.p90Ms !== null && summary.p90Ms <= targetFrameMs
  summary.meets120HzP99Budget = summary.p99Ms !== null && summary.p99Ms <= targetFrameMs
  summary.meetsGpuixViewRenderBudget =
    summary.viewRenderP90Ms !== null && summary.viewRenderP90Ms <= maxGpuixViewRenderP90Ms
  summary.meetsGpuixViewBuildBudget =
    summary.viewBuildP90Ms !== null && summary.viewBuildP90Ms <= maxGpuixViewBuildP90Ms
  summary.unexpectedCanvasRevisionChanges =
    name === "canvas-wheel-zoom"
      ? performanceReport.canvasRevisionGuard?.unexpectedChanges?.length ?? null
      : null
  summary.meetsCanvasRevisionBudget =
    name !== "canvas-wheel-zoom" || summary.unexpectedCanvasRevisionChanges === 0
  summary.meetsGpuixControlledBudget =
    summary.meetsGpuixViewRenderBudget &&
    summary.meetsGpuixViewBuildBudget &&
    summary.meetsCanvasRevisionBudget

  // Total draw time remains valuable telemetry, but a shared GitHub macOS runner
  // can stall layout/prepaint/paint outside GpuixView by tens of milliseconds.
  // Gate the costs this project controls, while keeping absolute 120 Hz p90/p99
  // visible so dedicated/stable hardware can enforce them separately.
  if (!summary.meets120HzP90Budget || !summary.meets120HzP99Budget) {
    console.warn(
      `${name} total draw exceeds 120 Hz telemetry budget: p90=${summary.p90Ms?.toFixed(2) ?? "n/a"}ms p99=${summary.p99Ms?.toFixed(2) ?? "n/a"}ms target=${targetFrameMs.toFixed(2)}ms`,
    )
  }
  if (!summary.meetsGpuixControlledBudget) summary.status = "budget-miss"
  performanceReport.scenarios[name] = summary
  persistPerformanceReport()
  return summary
}

function assertCachedPrepaintReuse(names) {
  const misses = names.flatMap((name) => {
    const summary = performanceReport.scenarios[name]
    return (summary?.cachedPrepaintHits ?? 0) > 0
      ? []
      : [`${name} produced no cached-prepaint reuse hits`]
  })
  assert(
    misses.length === 0,
    `Nested retained-region cache reuse regressed: ${misses.join("; ")}`,
  )
}

function enforcePerformanceBudgets(names) {
  if (!enforce120HzBudget) return

  const misses = names.flatMap((name) => {
    const summary = performanceReport.scenarios[name]
    if (summary?.meetsGpuixControlledBudget) return []
    return [
      [
        name,
        `viewRenderP90=${summary?.viewRenderP90Ms?.toFixed(3) ?? "n/a"}ms/${maxGpuixViewRenderP90Ms.toFixed(2)}ms`,
        `viewBuildP90=${summary?.viewBuildP90Ms?.toFixed(3) ?? "n/a"}ms/${maxGpuixViewBuildP90Ms.toFixed(2)}ms`,
        name === "canvas-wheel-zoom"
          ? `unexpectedCanvasChanges=${summary?.unexpectedCanvasRevisionChanges ?? "n/a"}/0 rootRevisionDelta=${summary?.rootRevisionDelta ?? "n/a"}`
          : null,
      ].filter(Boolean).join(" "),
    ]
  })
  assert(
    misses.length === 0,
    `GPUIX controlled performance budget missed: ${misses.join("; ")}`,
  )
}

async function profileNativeFrames(app, name, exercise, { minimumSamples = 1 } = {}) {
  const probeTimeoutMs = 15_000
  const probeStartedAt = performance.now()
  const scenario = { status: "running", phase: "reset", minimumSamples }
  performanceReport.scenarios[name] = scenario
  persistPerformanceReport()

  let timeout
  let phase = "reset"
  const setPhase = (next) => {
    phase = next
    scenario.phase = next
  }

  try {
    await Promise.race([
      (async () => {
        await app.performance.reset()
        setPhase("baseline stats")
        // Native reset clears timing samples but intentionally preserves the lifetime
        // frame counter, so keep an explicit baseline for this interaction window.
        const baseline = await app.performance.stats()
        scenario.baseline = baseline
        persistPerformanceReport()

        // The active editor can draw between reset() and stats(), so the baseline
        // read may already contain one pre-interaction sample. Keep its lifetime
        // frame counter, then clear timing samples again before the labeled work.
        setPhase("measurement reset")
        await app.performance.reset()

        const startedAt = performance.now()
        setPhase("exercise")
        await exercise((detail) => { setPhase(`exercise (${detail})`) })
        setPhase("settling")
        // Give the native renderer enough time to record the last interaction frame.
        await delay(80)
        const elapsedMs = Math.max(1, performance.now() - startedAt)
        setPhase("final stats")
        const stats = await app.performance.stats()
        const frames = Math.max(0, stats.frames - baseline.frames)
        const observedFps = frames * 1000 / elapsedMs
        const p90Ms = stats.p90Ms ?? null
        const p99Ms = stats.p99Ms ?? null
        Object.assign(scenario, {
          status: "passed",
          phase: "complete",
          elapsedMs,
          observedFps,
          currentMs: stats.currentMs ?? null,
          p90Ms,
          p99Ms,
          maxMs: stats.maxMs ?? null,
          drawRootsP90Ms: stats.drawRootsP90Ms ?? null,
          drawRootsP99Ms: stats.drawRootsP99Ms ?? null,
          drawRootsMaxMs: stats.drawRootsMaxMs ?? null,
          drawRootsSamples: stats.drawRootsSamples ?? null,
          prepaintP90Ms: stats.prepaintP90Ms ?? null,
          prepaintP99Ms: stats.prepaintP99Ms ?? null,
          prepaintMaxMs: stats.prepaintMaxMs ?? null,
          prepaintSamples: stats.prepaintSamples ?? null,
          paintP90Ms: stats.paintP90Ms ?? null,
          paintP99Ms: stats.paintP99Ms ?? null,
          paintMaxMs: stats.paintMaxMs ?? null,
          paintSamples: stats.paintSamples ?? null,
          rootRequestP90Ms: stats.rootRequestP90Ms ?? null,
          rootRequestP99Ms: stats.rootRequestP99Ms ?? null,
          rootLayoutP90Ms: stats.rootLayoutP90Ms ?? null,
          rootLayoutP99Ms: stats.rootLayoutP99Ms ?? null,
          rootPrepaintP90Ms: stats.rootPrepaintP90Ms ?? null,
          rootPrepaintP99Ms: stats.rootPrepaintP99Ms ?? null,
          prepaintRestP90Ms: stats.prepaintRestP90Ms ?? null,
          prepaintRestP99Ms: stats.prepaintRestP99Ms ?? null,
          cachedPrepaintReuseP90Ms: stats.cachedPrepaintReuseP90Ms ?? null,
          cachedPrepaintReuseP99Ms: stats.cachedPrepaintReuseP99Ms ?? null,
          cachedPrepaintRenderP90Ms: stats.cachedPrepaintRenderP90Ms ?? null,
          cachedPrepaintRenderP99Ms: stats.cachedPrepaintRenderP99Ms ?? null,
          cachedPrepaintHits: stats.cachedPrepaintHits ?? null,
          cachedPrepaintMisses: stats.cachedPrepaintMisses ?? null,
          cachedPrepaintColdMisses: stats.cachedPrepaintColdMisses ?? null,
          cachedPrepaintKeyMisses: stats.cachedPrepaintKeyMisses ?? null,
          cachedPrepaintDirtyMisses: stats.cachedPrepaintDirtyMisses ?? null,
          cachedPrepaintRefreshingMisses: stats.cachedPrepaintRefreshingMisses ?? null,
          canvasPrepareP90Ms: stats.canvasPrepareP90Ms ?? null,
          canvasPrepareP99Ms: stats.canvasPrepareP99Ms ?? null,
          canvasPrepareMaxMs: stats.canvasPrepareMaxMs ?? null,
          canvasPrepareSamples: stats.canvasPrepareSamples ?? null,
          viewRenderCurrentMs: stats.viewRenderCurrentMs ?? null,
          viewRenderP90Ms: stats.viewRenderP90Ms ?? null,
          viewRenderP99Ms: stats.viewRenderP99Ms ?? null,
          viewRenderMaxMs: stats.viewRenderMaxMs ?? null,
          viewRenderSamples: stats.viewRenderSamples ?? null,
          viewBuildCurrentMs: stats.viewBuildCurrentMs ?? null,
          viewBuildP90Ms: stats.viewBuildP90Ms ?? null,
          viewBuildP99Ms: stats.viewBuildP99Ms ?? null,
          viewBuildMaxMs: stats.viewBuildMaxMs ?? null,
          viewBuildSamples: stats.viewBuildSamples ?? null,
          rootRevisionStart: baseline.rootSubtreeRevision ?? null,
          rootRevisionEnd: stats.rootSubtreeRevision ?? null,
          rootRevisionDelta:
            baseline.rootSubtreeRevision !== undefined && stats.rootSubtreeRevision !== undefined
              ? stats.rootSubtreeRevision - baseline.rootSubtreeRevision
              : null,
          frames,
          samples: stats.samples,
          meets120HzP90Budget: p90Ms !== null && p90Ms <= targetFrameMs,
          meets120HzP99Budget: p99Ms !== null && p99Ms <= targetFrameMs,
          meets120HzDrawBudget: p90Ms !== null && p90Ms <= targetFrameMs,
          baseline,
          final: stats,
        })
        persistPerformanceReport()
        assert(
          stats.samples >= minimumSamples && frames >= minimumSamples,
          `${name} produced too few native frame samples: ${JSON.stringify({
            minimumSamples,
            baseline,
            final: stats,
            frames,
            elapsedMs,
          })}`,
        )
      })(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          const message = `${name} native performance probe timed out during ${phase} after ${probeTimeoutMs}ms`
          Object.assign(scenario, {
            status: "timed-out",
            phase,
            elapsedMs: Math.max(1, performance.now() - probeStartedAt),
            error: message,
          })
          persistPerformanceReport()
          reject(new Error(message))
        }, probeTimeoutMs)
      }),
    ])
  } catch (error) {
    if (scenario.status !== "timed-out") {
      Object.assign(scenario, {
        status: "failed",
        phase,
        elapsedMs: Math.max(1, performance.now() - probeStartedAt),
        error: error instanceof Error ? error.message : String(error),
      })
      persistPerformanceReport()
    }
    throw error
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function assertText(root, text, label = text) {
  assert(descendants(root).some((node) => (node.text ?? "").includes(text)), `Expected visible ${label}`)
}

function assertInspectorShowsTransformControls(root) {
  const sidebar = descendants(root).find((node) => node.bounds?.x >= 1000 && node.bounds?.width >= 240 && node.bounds?.height >= 400)
  const content = sidebar ? textContent(sidebar) : textContent(root)
  for (const label of ["Transform", "Position", "Layout"]) {
    assert(content.includes(label), `Inspector did not show ${label} after layer-row selection`)
  }
  assert(!content.includes("Background"), "Inspector still showed Background after selecting the layer row")
}

function assertInspectorAppearanceRowsStack(root) {
  const opacity = findText(root, "Opacity")
  const blending = findText(root, "Blending")
  assert(opacity.bounds && blending.bounds, "Appearance control labels have no native bounds")
  assert(
    blending.bounds.y >= opacity.bounds.y + opacity.bounds.height + 4,
    `Appearance rows overlap: ${JSON.stringify({ opacity: opacity.bounds, blending: blending.bounds })}`,
  )
}

function assertInspectorSectionHeadings(root) {
  const layout = findText(root, "Layout")
  assert(layout.bounds && layout.bounds.width > 0 && layout.bounds.height > 0, "Layout heading has no painted native bounds")
  const inspectorLeft = layout.bounds.x

  for (const label of ["Time", "Transform", "Appearance"]) {
    const heading = findText(root, label)
    assert(
      heading.bounds &&
        heading.bounds.width > 0 &&
        heading.bounds.height > 0 &&
        Math.abs(heading.bounds.x - inspectorLeft) <= 2,
      `${label} heading is not aligned to the Inspector section gutter: ${JSON.stringify({
        layout: layout.bounds,
        heading: heading.bounds,
      })}`,
    )
  }
}

function assertPopupAnchored(root, label) {
  const parents = indexParents(root)
  let current = findText(root, label)
  while (current && current.type !== "anchored") current = parents.get(current.id)
  assert(current?.bounds, `${label} popup has no painted native anchored layer`)
}

function assertChatTableRows(root) {
  const a = findText(root, "A")
  const b = findText(root, "B")
  const one = findText(root, "1")
  const two = findText(root, "2")
  for (const [label, node] of [["A", a], ["B", b], ["1", one], ["2", two]]) {
    assert(node.bounds && node.bounds.width > 0 && node.bounds.height > 0, `Chat Markdown table cell ${label} has no painted bounds`)
  }
  assert(
    Math.abs(a.bounds.y - b.bounds.y) <= 2 && b.bounds.x > a.bounds.x,
    `Chat Markdown header cells did not share one row: ${JSON.stringify({ a: a.bounds, b: b.bounds })}`,
  )
  assert(
    Math.abs(one.bounds.y - two.bounds.y) <= 2 && two.bounds.x > one.bounds.x,
    `Chat Markdown value cells did not share one row: ${JSON.stringify({ one: one.bounds, two: two.bounds })}`,
  )
  assert(
    one.bounds.y >= a.bounds.y + a.bounds.height - 2 && one.bounds.y - a.bounds.y <= 40,
    `Chat Markdown table rows are vertically over-expanded: ${JSON.stringify({ header: a.bounds, value: one.bounds })}`,
  )
}

function getEditorCanvases(root) {
  const editor = findNode(root, (node) => node.testId === "diffusion-source-editor", "Diffusion EditorPage")
  return descendants(editor).filter((node) => node.type === "canvas" && node.bounds)
}

async function waitForEditor(app) {
  return await waitFor("Diffusion EditorPage", async () => {
    const tree = await currentTree(app)
    const editor = descendants(tree).find((node) => node.testId === "diffusion-source-editor")
    const canvases = editor ? descendants(editor).filter((node) => node.type === "canvas" && node.bounds) : []
    return editor && canvases.length >= 2 ? { tree, editor, canvases } : null
  })
}

async function getFreshTree(app) {
  const tree = await currentTree(app)
  assert(tree, "Native automation tree disappeared")
  return tree
}

async function openProjectMenu(app) {
  const trigger = app.getByTestId("diffusion-project-menu-trigger")
  await trigger.waitFor()
  const bounds = await trigger.bounds()
  assert(bounds && bounds.width > 0 && bounds.height > 0, "Project menu trigger has no clickable bounds")
  await physicalClick(app, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })
  return await waitFor("project menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "File") && descendants(next).some((node) => node.text === "View")
      ? next
      : null
  })
}

async function openProjectEditMenu(app) {
  let tree = await openProjectMenu(app)
  const editTrigger = findText(tree, "Edit")
  await app.mouse.move({
    x: editTrigger.bounds.x + editTrigger.bounds.width / 2,
    y: editTrigger.bounds.y + editTrigger.bounds.height / 2,
  })
  await delay(350)
  return await waitFor("project menu Edit submenu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Undo") && descendants(next).some((node) => node.text === "Redo")
      ? next
      : null
  })
}

async function waitForInputValue(app, expected, label) {
  const mirror = app.getByTestId("diffusion-inspector-position-x-value")
  return await waitFor(label, async () => {
    const actual = (await mirror.textContent()).trim()
    return actual === expected ? actual : null
  })
}

function findAssetsPlus(tree) {
  const parentById = indexParents(tree)
  const tabRow = descendants(tree)
    .filter((node) => node.bounds && textContent(node).includes("Assets") && textContent(node).includes("Chat"))
    .sort((a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height)[0]
  assert(tabRow, "Could not find Assets/Chat tab row")
  let row = tabRow
  while (parentById.has(row.id)) {
    const parent = parentById.get(row.id)
    const rowBounds = row.bounds
    const siblings = (parent.children ?? []).filter((node) => {
      const bounds = node.bounds
      return node.id !== row.id && bounds && bounds.x >= rowBounds.x + rowBounds.width - 2 && bounds.y < rowBounds.y + rowBounds.height + 20
    })
    siblings.sort((a, b) => a.bounds.x - b.bounds.x)
    if (siblings[0]) return siblings[0]
    row = parent
  }
  throw new Error("Could not derive the Assets add-menu trigger from the tab header")
}

function toolbarParts(tree) {
  const rectangle = findNode(tree, (node) => node.testId === "diffusion-toolbar-rectangle", "Rectangle toolbar control")
  const parents = indexParents(tree)
  const toolbar = parents.get(rectangle.id)
  assert(toolbar, "Rectangle toolbar control has no toolbar parent")
  const children = toolbar.children ?? []
  const index = children.findIndex((node) => node.id === rectangle.id)
  const visibleBefore = children.slice(0, index).filter((node) => (node.bounds?.width ?? 0) > 2)
  const visibleAfter = children.slice(index + 1).filter((node) => (node.bounds?.width ?? 0) > 2)
  assert(visibleBefore.at(-1) && visibleAfter[0] && visibleAfter[1], "Could not resolve Scene, Text, and toolbar dropdown controls")
  const moveGroup = children[0]
  const moveHandTrigger = moveGroup?.children?.[1]
  assert(moveHandTrigger?.bounds, "Could not derive the Move/Hand menu trigger")
  return {
    scene: visibleBefore.at(-1),
    rectangle,
    text: visibleAfter[0],
    ai: visibleAfter.at(-1),
    moveHandTrigger,
  }
}

const stderrChunks = []
const stdoutLogChunks = []
for (const path of Object.values(screenshots)) if (existsSync(path)) unlinkSync(path)
if (existsSync(performancePath)) unlinkSync(performancePath)

const child = spawn("bun", ["dist/app/index.js"], {
  cwd: exampleDirectory,
  env: { ...process.env, GPUIX_BACKGROUND: "1" },
  stdio: ["pipe", "pipe", "pipe"],
})
child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString("utf8")))
child.stdout.on("data", (chunk) => stdoutLogChunks.push(chunk.toString("utf8")))
const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })))

let app
try {
  app = await Promise.race([
    connectStdio({
      write(chunk) { child.stdin.write(chunk) },
      feed(listener) { child.stdout.on("data", (buffer) => listener(buffer.toString("utf8"))) },
      async close() { if (!child.killed) child.kill() },
      requestTimeoutMs: rpcTimeoutMs,
    }),
    exited.then(({ code, signal }) => {
      throw new Error(`Diffusion exited before automation connected (code=${code}, signal=${signal})\n${stderrChunks.join("")}`)
    }),
  ])

  const initial = await waitForEditor(app)
  const stage = [...initial.canvases]
    .sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0]
  assert(stage?.bounds && stage.bounds.width > 400 && stage.bounds.height > 300, "EngineCanvas did not paint at a useful size")

  const stageBottom = stage.bounds.y + stage.bounds.height
  const timeline = initial.canvases
    .filter((node) => node.id !== stage.id && node.bounds.y >= stageBottom - 2)
    .sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0]
  assert(
    timeline?.bounds &&
      Math.abs(timeline.bounds.x - stage.bounds.x) <= 2 &&
      Math.abs(timeline.bounds.width - stage.bounds.width) <= 2 &&
      timeline.bounds.height > 100,
    "Timeline canvas did not mount in the editor row below EngineCanvas",
  )
  assertText(initial.tree, "Assets", "Assets navigation")
  assertText(initial.tree, "Chat", "Chat navigation")
  await screenshot(app, "initial")

  const at = (bounds, x, y) => ({ x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y })

  // Start from the layer row so the Inspector check follows source semantics
  // instead of depending on a camera-space coordinate for the seeded rectangle.
  // Canvas hit-testing is exercised by the real DrawOverlay move/resize gestures
  // below, which operate on geometry created by this test.
  let tree = await getFreshTree(app)
  const layerLabel = findText(tree, "GPUix rectangle")
  await clickNode(app, layerLabel)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)
  assertInspectorAppearanceRowsStack(tree)
  assertInspectorSectionHeadings(tree)

  // Exercise an actual Inspector field through its semantic input surface, then
  // restore the seeded value so later canvas geometry remains deterministic.
  const positionX = app.getByTestId("diffusion-inspector-position-x")
  await positionX.waitFor()
  await positionX.fill("121")
  await positionX.press("enter")
  await delay(140)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)
  await waitForInputValue(app, "121", "Inspector X edit")

  tree = await openProjectEditMenu(app)
  await clickNode(app, findText(tree, "Undo"))
  await waitForInputValue(app, "120", "Edit > Undo Inspector X")

  tree = await openProjectEditMenu(app)
  await clickNode(app, findText(tree, "Redo"))
  await waitForInputValue(app, "121", "Edit > Redo Inspector X")

  await positionX.fill("120")
  await positionX.press("enter")
  await delay(140)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)

  // The right Inspector must own its wheel input and remain responsive. The
  // source's ControlScrollArea is instrumented only in this acceptance build.
  const inspectorScroll = app.getByTestId("diffusion-control-scroll-area-scroll")
  await inspectorScroll.waitFor()
  const inspectorViewportBounds = await inspectorScroll.bounds()
  // Keep wheel input anchored to the visible viewport. GPUI reports a scrolled
  // element's painted bounds with its content translation applied, so reusing
  // that translated y coordinate after the first wheel can point above the
  // viewport even though the ScrollHandle itself is still live.
  const inspectorViewportPoint = {
    x: inspectorViewportBounds.x + inspectorViewportBounds.width / 2,
    y: inspectorViewportBounds.y + inspectorViewportBounds.height / 2,
  }
  const inspectorScrollNode = await inspectorScroll.element()
  assert(app.backend.getScrollOffset, "Live automation backend does not expose native scroll offsets")
  const inspectorOffsetAtTop = await app.backend.getScrollOffset(inspectorScrollNode.id)
  assert(inspectorOffsetAtTop, "Inspector scroll area has no native scroll state")
  await app.mouse.wheel(inspectorViewportPoint, 0, -220)
  await delay(180)
  const inspectorOffsetAfterWheel = await app.backend.getScrollOffset(inspectorScrollNode.id)
  assert(
    inspectorOffsetAfterWheel && inspectorOffsetAfterWheel[1] !== inspectorOffsetAtTop[1],
    `Inspector wheel did not mutate the native scroll offset: ${JSON.stringify({
      before: inspectorOffsetAtTop,
      after: inspectorOffsetAfterWheel,
    })}`,
  )
  tree = await getFreshTree(app)
  const sourceAfter = findText(tree, "Source")
  assert(sourceAfter.bounds, "Inspector Source heading did not paint after scrolling into view")
  await screenshot(app, "inspectorScrolled")
  await app.mouse.wheel(inspectorViewportPoint, 0, 220)
  await delay(180)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)
  assertInspectorSectionHeadings(tree)
  await screenshot(app, "layerInspector")

  // Measure the exact wheel-heavy Inspector path the manual report called out.
  // Resolve the element identity once, then read only its native painted bounds
  // before each wheel. That keeps hit testing current without serializing the
  // full automation tree for every sample.
  const inspectorOffsetBefore = await app.backend.getScrollOffset(inspectorScrollNode.id)
  assert(inspectorOffsetBefore, "Inspector scroll area has no native ScrollHandle")
  // Probe toward the interior so the wheel must have room to change the
  // ScrollHandle, but keep using the viewport point captured before any scroll.
  const inspectorProbeDelta = inspectorOffsetBefore[1] < 0 ? 24 : -24
  await app.mouse.wheel(inspectorViewportPoint, 0, inspectorProbeDelta)
  await delay(40)
  const inspectorOffsetAfter = await app.backend.getScrollOffset(inspectorScrollNode.id)
  performanceReport.inspectorScrollProbe = {
    point: inspectorViewportPoint,
    deltaY: inspectorProbeDelta,
    before: inspectorOffsetBefore,
    after: inspectorOffsetAfter,
  }
  writeFileSync(performancePath, `${JSON.stringify(performanceReport, null, 2)}\n`)
  assert(
    inspectorOffsetAfter && inspectorOffsetAfter[1] !== inspectorOffsetBefore[1],
    `Inspector wheel did not mutate the native scroll offset: ${JSON.stringify(performanceReport.inspectorScrollProbe)}`,
  )
  await app.mouse.wheel(inspectorViewportPoint, 0, -inspectorProbeDelta)
  await delay(80)

  const inspectorProfileLegSteps = 10
  const inspectorProfileCycles = 4
  const inspectorProfileSteps = inspectorProfileLegSteps * inspectorProfileCycles * 2
  // Bounce inside the fixture's 96 px vertical travel so every sample performs
  // real scroll work while the longer window makes p99 statistically useful.
  const inspectorProfileDelta = inspectorOffsetBefore[1] < 0 ? 6 : -6
  const inspectorProfileRuns = []
  for (let run = 1; run <= 3; run += 1) {
    const runName = `inspector-wheel-run-${run}`
    inspectorProfileRuns.push(runName)
    await profileNativeFrames(app, runName, async (mark) => {
      const pending = []
      let sample = 0
      for (let cycle = 0; cycle < inspectorProfileCycles; cycle += 1) {
        for (const deltaY of [inspectorProfileDelta, -inspectorProfileDelta]) {
          for (let step = 0; step < inspectorProfileLegSteps; step += 1) {
            sample += 1
            mark(`wheel ${sample}/${inspectorProfileSteps}`)
            pending.push(app.mouse.wheel(inspectorViewportPoint, 0, deltaY))
            // Queue the next wheel input at the target cadence instead of
            // serializing the gesture on each automation round trip.
            await delay(targetFrameMs)
          }
        }
      }
      await Promise.all(pending)
    })
    await delay(120)
  }
  summarizeProfiles("inspector-wheel", inspectorProfileRuns)

  // Exercise DrawOverlay through its real toolbar + native pointer sequence.
  let parts = toolbarParts(tree)
  await clickNode(app, parts.rectangle)
  // The pinned fixture's 640×360 scene sits at 30% zoom inside EngineCanvas.
  // Draw in the scene's empty lower-right region, away from the seeded green
  // rectangle and away from the scene boundary so small layout shifts cannot
  // turn the gesture into an out-of-scene drag.
  await drag(app, at(stage.bounds, 0.44, 0.45), at(stage.bounds, 0.53, 0.56), 12)
  await screenshot(app, "rectangle")
  tree = await waitFor("new native rectangle layer", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Rect 1") ? next : null
  })
  assertInspectorShowsTransformControls(tree)
  await drag(app, at(stage.bounds, 0.485, 0.505), at(stage.bounds, 0.505, 0.525), 8)
  tree = await getFreshTree(app)
  await screenshot(app, "rectangleMoved")
  assert(
    !readFileSync(screenshots.rectangle).equals(readFileSync(screenshots.rectangleMoved)),
    "Canvas drag did not produce a visible moved-rectangle frame",
  )

  // Resize the selected Rect 1 through its lower-right HUD handle. The rectangle
  // was drawn from .44/.45 to .53/.56 and then moved by .02/.02 above, so this
  // point targets the retained selection handle rather than a guessed UI node.
  await drag(app, at(stage.bounds, 0.55, 0.58), at(stage.bounds, 0.58, 0.61), 12)
  await delay(220)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)
  assertInspectorAppearanceRowsStack(tree)
  await screenshot(app, "rectangleResized")
  assert(
    !readFileSync(screenshots.rectangleMoved).equals(readFileSync(screenshots.rectangleResized)),
    "Canvas resize did not produce a visible resized-rectangle frame",
  )

  // Prove the engine remains responsive after the HUD has painted several
  // post-resize frames. This specifically guards the manual freeze regression.
  await delay(240)
  tree = await getFreshTree(app)
  assertText(tree, "Rect 1", "resized rectangle layer after engine frames")

  // The resize path above is the original manual failure: Diffusion draws its
  // dimension HUD with a retained Canvas transform. Keep the editor alive for
  // several more frames and then prove an unrelated control remains usable.
  await delay(320)
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)
  assertText(tree, "Rect 1", "resized rectangle layer after retained Canvas text paint")

  // AI prompt mounts from the copied Assets action; no generation request is sent.
  // The source handler is on the full-width Button, not its painted text leaf.
  const generate = findText(tree, "Generate with AI")
  const generateButton = paintedRowAncestor(tree, generate, { minWidth: 120, minHeight: 28, maxHeight: 40 })
  assert(
    generateButton,
    `Generate with AI did not expose a painted button row: ${JSON.stringify(
      (() => {
        const parents = indexParents(tree)
        const chain = []
        let current = parents.get(generate.id)
        while (current && chain.length < 6) {
          chain.push({ type: current.type, bounds: current.bounds, text: textContent(current) })
          current = parents.get(current.id)
        }
        return chain
      })(),
    )}`,
  )
  const generateBounds = generateButton.bounds
  assert(generateBounds, "Generate with AI button row has no native bounds")
  // Click the button's left padding rather than its centered text leaf. GPUIX
  // native hit testing targets the painted leaf under the pointer; using the
  // row padding ensures the source Button owns the synthesized click.
  await physicalClick(app, {
    x: generateBounds.x + Math.min(8, generateBounds.width / 4),
    y: generateBounds.y + generateBounds.height / 2,
  })
  tree = await waitFor("AI prompt textarea", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.type === "textarea") ? next : null
  })
  await screenshot(app, "aiPrompt")
  const promptArea = findNode(tree, (node) => node.type === "textarea", "AI prompt editor")
  await app.backend.keystrokes(promptArea.id, "escape")
  await delay(180)
  tree = await getFreshTree(app)
  if (descendants(tree).some((node) => node.type === "textarea")) {
    const parts = toolbarParts(tree)
    await clickNode(app, parts.ai)
    await delay(180)
    tree = await getFreshTree(app)
  }
  assert(!descendants(tree).some((node) => node.type === "textarea"), "AI prompt did not close without submitting")

  // DrawOverlay enters TEXT_EDIT and mounts the native Text/textarea editing path.
  parts = toolbarParts(tree)
  await clickNode(app, parts.text)
  await physicalClick(app, at(stage.bounds, 0.28, 0.34))
  tree = await waitFor("Diffusion text edit control", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.type === "textarea") ? next : null
  })
  assertText(tree, "Typography", "text Inspector while editing")
  assertText(tree, "Content", "text content row while editing")
  let textArea = findNode(tree, (node) => node.type === "textarea", "text editing control")
  await app.getByType("textarea").fill("GPUix native text")
  await delay(220)
  tree = await getFreshTree(app)
  assertText(tree, "Typography", "text Inspector after typing")
  await screenshot(app, "textEdit")
  textArea = findNode(tree, (node) => node.type === "textarea", "text editing control after typing")
  await app.backend.keystrokes(textArea.id, "enter")
  await delay(220)
  tree = await getFreshTree(app)
  assertText(tree, "Typography", "text Inspector after Enter commit")
  assertText(tree, "Content", "text content row after Enter commit")
  await screenshot(app, "textEdit")
  await clickNode(app, findText(tree, "GPUix rectangle"))
  tree = await getFreshTree(app)
  assertInspectorShowsTransformControls(tree)

  // Marquee drag on blank EngineCanvas space after text editing has blurred.
  await drag(app, at(stage.bounds, 0.78, 0.76), at(stage.bounds, 0.88, 0.84), 8)
  tree = await getFreshTree(app)
  assertText(tree, "Background", "blank-space marquee deselection")
  assert(getEditorCanvases(tree).length >= 2, "EngineCanvas or timeline stopped painting after marquee drag")

  // Exercise the real Kobalte layer context menu while the seeded row is still
  // visible and untransformed. Later timeline overflow and project zoom move this
  // row outside the viewport, so carrying its bounds forward would test stale geometry.
  tree = await getFreshTree(app)
  const rowLabel = findText(tree, "GPUix rectangle")
  const row = paintedRowAncestor(tree, rowLabel)
  assert(row, "Could not resolve the painted layer row for context-menu interaction")
  const rowBounds = await findBounds(row, app)
  assert(rowBounds && rowBounds.width > 0 && rowBounds.height > 0, "Layer row has no clickable bounds")
  const contextPoint = {
    x: rowBounds.x + rowBounds.width / 2,
    y: rowBounds.y + rowBounds.height / 2,
  }
  await app.mouse.move(contextPoint)
  await delay(45)
  await app.mouse.click(contextPoint, { button: 2 })
  await delay(180)
  tree = await waitFor("layer context menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Mute") ? next : null
  })
  await screenshot(app, "contextMenu")
  const mute = findText(tree, "Mute")
  await app.backend.keystrokes(mute.id, "escape")
  await delay(150)

  // Build enough real timeline rows to overflow the layer viewport, then drive
  // the upstream Layers wheel handler. Each DrawOverlay insertion returns to
  // Move, so re-arm Rectangle through the real toolbar before every gesture.
  const extraRects = [
    [[0.43, 0.45], [0.46, 0.49]],
    [[0.48, 0.45], [0.51, 0.49]],
    [[0.53, 0.45], [0.56, 0.49]],
    [[0.43, 0.52], [0.46, 0.56]],
    [[0.48, 0.52], [0.51, 0.56]],
    [[0.53, 0.52], [0.56, 0.56]],
  ]
  for (const [index, [from, to]] of extraRects.entries()) {
    tree = await getFreshTree(app)
    parts = toolbarParts(tree)
    await clickNode(app, parts.rectangle)
    await drag(app, at(stage.bounds, from[0], from[1]), at(stage.bounds, to[0], to[1]), 8)
    const expectedLayer = `Rect ${index + 2}`
    tree = await waitFor(expectedLayer, async () => {
      const next = await currentTree(app)
      return descendants(next).some((node) => node.text === expectedLayer) ? next : null
    }, 4_000)
  }

  const layerBeforeScroll = findText(tree, "GPUix rectangle")
  assert(layerBeforeScroll.bounds, "Timeline layer label has no bounds before wheel scrolling")
  const layerScroll = app.getByTestId("diffusion-timeline-layers-scroll")
  await layerScroll.waitFor()
  const layerScrollNode = await layerScroll.element()
  const layerScrollPoint = {
    x: layerScrollNode.bounds.x + layerScrollNode.bounds.width / 2,
    y: layerScrollNode.bounds.y + layerScrollNode.bounds.height / 2,
  }
  const layerBeforeY = layerBeforeScroll.bounds.y
  await layerScroll.wheel(0, -180)
  tree = await waitFor("timeline layer wheel translation", async () => {
    const next = await currentTree(app)
    const label = descendants(next).find((node) => node.type === "text" && node.text === "GPUix rectangle")
    return label?.bounds && Math.abs(label.bounds.y - layerBeforeY) >= 20 ? next : null
  }, 4_000)
  await screenshot(app, "timelineScrolled")

  const layerAfterScroll = findText(tree, "GPUix rectangle")
  assert(
    layerAfterScroll.bounds && layerAfterScroll.bounds.y < layerBeforeY - 20,
    `Timeline layer wheel should move rows upward; before=${layerBeforeY}, after=${layerAfterScroll.bounds?.y}`,
  )
  await layerScroll.wheel(0, 180)
  tree = await waitFor("timeline layer wheel restore", async () => {
    const next = await currentTree(app)
    const label = descendants(next).find((node) => node.type === "text" && node.text === "GPUix rectangle")
    return label?.bounds && Math.abs(label.bounds.y - layerBeforeY) <= 3 ? next : null
  }, 4_000)

  // The timeline ruler uses getTransform().transformPoint() for its coordinates.
  // Re-read its live bounds after the preceding editor mutations instead of
  // carrying the startup rectangle through layout changes. The ruler is 36px
  // high in the pinned source, so its vertical midpoint is a stable hit target.
  let liveTimeline = getEditorCanvases(tree).find((node) => node.id === timeline.id)
  assert(liveTimeline?.bounds, "Timeline canvas disappeared before ruler interaction")
  const timeBefore = findNode(tree, (node) => node.type === "text" && /^\d\d:\d\d:\d\d$/.test(node.text ?? ""), "timeline time display")
  const timeBeforeText = timeBefore.text
  await physicalClick(app, {
    x: liveTimeline.bounds.x + liveTimeline.bounds.width * 0.5,
    y: liveTimeline.bounds.y + 18,
  })
  tree = await waitFor("timeline playhead seek", async () => {
    const next = await currentTree(app)
    const time = descendants(next).find((node) => node.type === "text" && /^\d\d:\d\d:\d\d$/.test(node.text ?? ""))
    return time?.text !== timeBeforeText ? next : null
  }, 3_000)

  liveTimeline = getEditorCanvases(tree).find((node) => node.id === timeline.id)
  assert(liveTimeline?.bounds, "Timeline canvas disappeared before ruler drag")
  const dragStart = { x: liveTimeline.bounds.x + liveTimeline.bounds.width * 0.58, y: liveTimeline.bounds.y + 18 }
  const dragEnd = { x: liveTimeline.bounds.x + liveTimeline.bounds.width * 0.72, y: liveTimeline.bounds.y + 18 }
  await drag(app, dragStart, dragEnd, 8)
  tree = await getFreshTree(app)
  assertText(tree, "Rect 1", "timeline remains painted after ruler drag")
  await screenshot(app, "timeline")

  // Dropdowns are driven using real mouse-down/up; close them without changing project state.
  tree = await openProjectMenu(app)
  assertPopupAnchored(tree, "File")
  await screenshot(app, "projectMenu")
  const viewTrigger = findText(tree, "View")
  await app.mouse.move({
    x: viewTrigger.bounds.x + viewTrigger.bounds.width / 2,
    y: viewTrigger.bounds.y + viewTrigger.bounds.height / 2,
  })
  await delay(350)
  tree = await waitFor("project menu View submenu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Zoom in") ? next : null
  })
  await screenshot(app, "projectViewSubmenu")
  const zoomIn = findText(tree, "Zoom in")
  await clickNode(app, zoomIn)
  await delay(160)
  tree = await getFreshTree(app)
  assertText(tree, "38%", "project View > Zoom in action from the fixture's initial 30% zoom")
  await screenshot(app, "projectZoomed")

  const zoomTrigger = app.getByTestId("diffusion-inspector-zoom-trigger")
  await zoomTrigger.waitFor()
  await zoomTrigger.click()
  tree = await waitFor("Inspector zoom menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Zoom to 100%") ? next : null
  })
  assertPopupAnchored(tree, "Zoom to 100%")
  await screenshot(app, "zoomMenu")
  await clickNode(app, findText(tree, "Zoom to 100%"))
  await delay(160)

  // Exercise the real EngineCanvas wheel-zoom path instead of accepting only
  // menu-driven camera changes. Browser trackpad pinch is delivered as a
  // ctrl-wheel event, which is the contract the native GPUIX bridge preserves.
  tree = await getFreshTree(app)
  const wheelZoomStage = getEditorCanvases(tree)
    .filter((node) => node.id !== timeline.id)
    .sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0]
  assert(wheelZoomStage?.bounds, "EngineCanvas disappeared before wheel zoom")
  const zoomReadout = app.getByTestId("diffusion-inspector-zoom-trigger")
  const zoomBeforeWheel = (await zoomReadout.textContent()).trim()
  await app.mouse.wheel(at(wheelZoomStage.bounds, 0.5, 0.5), 0, 20, { modifiers: "ctrl" })
  const zoomAfterWheel = await waitFor("EngineCanvas ctrl-wheel zoom", async () => {
    const next = (await zoomReadout.textContent()).trim()
    return next !== zoomBeforeWheel ? next : null
  }, 4_000)
  assert(zoomAfterWheel !== zoomBeforeWheel, `Canvas wheel zoom did not change zoom from ${zoomBeforeWheel}`)
  await screenshot(app, "canvasZoomed")

  // Diagnose which retained UI nodes actually change during camera zoom.
  // This runs outside the timed performance window and resets camera state
  // before the measured captures below.
  const canvasRevisionTrace = []
  let revisionTree = await currentTree(app)
  const zoomRevisionRoot = findNode(
    revisionTree,
    (node) => node.testId === "diffusion-inspector-zoom-trigger",
    "Inspector zoom trigger in automation tree",
  )
  const allowedZoomRevisionIds = new Set(descendants(zoomRevisionRoot).map((node) => node.id))
  for (let tick = 1; tick <= 3; tick += 1) {
    await app.mouse.wheel(
      at(wheelZoomStage.bounds, 0.5, 0.5),
      0,
      4,
      { modifiers: "ctrl" },
    )
    await delay(80)
    const nextTree = await currentTree(app)
    const changed = diffAutomationTrees(revisionTree, nextTree)
    canvasRevisionTrace.push({
      tick,
      zoom: (await zoomReadout.textContent()).trim(),
      changed,
      unexpected: changed.filter((change) => !allowedZoomRevisionIds.has(change.id)),
    })
    revisionTree = nextTree
  }
  const unexpectedCanvasRevisionChanges = canvasRevisionTrace.flatMap(({ tick, unexpected }) =>
    unexpected.map((change) => ({ tick, ...change })),
  )
  performanceReport.canvasRevisionTrace = canvasRevisionTrace
  performanceReport.canvasRevisionGuard = {
    zoomSubtreeRootId: zoomRevisionRoot.id,
    allowedIds: [...allowedZoomRevisionIds].sort((a, b) => a - b),
    unexpectedChanges: unexpectedCanvasRevisionChanges,
  }
  persistPerformanceReport()

  await zoomReadout.click()
  tree = await waitFor("Inspector zoom reset menu after revision trace", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Zoom to 100%") ? next : null
  })
  await clickNode(app, findText(tree, "Zoom to 100%"))
  await delay(160)

  // Keep the camera hot long enough to measure the real retained Canvas path,
  // including Diffusion's RAF systems and GPUIX draw-list handoff. Use long
  // directional blocks instead of event-by-event alternation so the camera
  // visibly moves on 60 Hz CI while the overall probe returns near its start.
  const canvasProfileLegSteps = 10
  const canvasProfileCycles = 4
  const canvasProfileSteps = canvasProfileLegSteps * canvasProfileCycles * 2
  const canvasProfileRuns = []
  for (let run = 1; run <= 3; run += 1) {
    const runName = `canvas-wheel-zoom-run-${run}`
    canvasProfileRuns.push(runName)
    await profileNativeFrames(app, runName, async (mark) => {
      let sample = 0
      for (let cycle = 0; cycle < canvasProfileCycles; cycle += 1) {
        for (const deltaY of [4, -4]) {
          for (let step = 0; step < canvasProfileLegSteps; step += 1) {
            sample += 1
            mark(`wheel ${sample}/${canvasProfileSteps}`)
            // Diffusion coalesces camera work through requestAnimationFrame. Keep
            // each ctrl-wheel RPC ordered so 80 pending inputs cannot collapse
            // into a handful of frames and make the draw percentiles meaningless.
            await app.mouse.wheel(
              at(wheelZoomStage.bounds, 0.5, 0.5),
              0,
              deltaY,
              { modifiers: "ctrl" },
            )
            await delay(targetFrameMs)
          }
        }
      }
    }, { minimumSamples: canvasProfileSteps / 2 })

    // Reset between captures so every run starts from the same camera scale.
    await zoomReadout.click()
    tree = await waitFor(`Inspector zoom reset menu run ${run}`, async () => {
      const next = await currentTree(app)
      return descendants(next).some((node) => node.text === "Zoom to 100%") ? next : null
    })
    await clickNode(app, findText(tree, "Zoom to 100%"))
    await delay(160)
  }
  summarizeProfiles("canvas-wheel-zoom", canvasProfileRuns)
  assertCachedPrepaintReuse(["inspector-wheel", "canvas-wheel-zoom"])
  enforcePerformanceBudgets(["inspector-wheel", "canvas-wheel-zoom"])

  tree = await getFreshTree(app)
  parts = toolbarParts(tree)
  await clickNode(app, parts.moveHandTrigger)
  tree = await waitFor("Move/Hand dropdown", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Hand") && descendants(next).some((node) => node.text === "Move")
      ? next
      : null
  })
  await screenshot(app, "moveHandMenu")
  await clickNode(app, findText(tree, "Hand"))
  tree = await getFreshTree(app)
  parts = toolbarParts(tree)
  await clickNode(app, parts.moveHandTrigger)
  tree = await waitFor("Move/Hand dropdown reopened", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Move") ? next : null
  })
  await clickNode(app, findText(tree, "Move"))

  // Create a scene from the copied editor's real preset popup.
  tree = await getFreshTree(app)
  parts = toolbarParts(tree)
  await clickNode(app, parts.scene)
  tree = await waitFor("Scene tool preset panel", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Square video 1:1") ? next : null
  })
  assert(textContent(tree).includes("1080×1920"), "Scene preset dimensions did not decode the JSX multiplication entity")
  assert(!textContent(tree).includes("&times;"), "Scene preset exposed a raw JSX entity")
  await screenshot(app, "scenePresetPanel")
  const presetTarget = findNode(
    tree,
    (node) => node.testId === "diffusion-scene-preset-Square video 1:1",
    "Square video preset button",
  )
  assert(
    presetTarget.bounds && presetTarget.bounds.width > 0 && presetTarget.bounds.height >= 28,
    `Square video preset button has invalid native bounds: ${JSON.stringify(presetTarget.bounds)}`,
  )
  await clickNode(app, presetTarget)
  tree = await waitFor("created and selected scene preset", async () => {
    const next = await currentTree(app)
    const labels = descendants(next).map((node) => node.text)
    return labels.includes("Export") && !labels.includes("Square video 1:1") ? next : null
  })
  assertText(tree, "Layout", "created scene Inspector")
  await screenshot(app, "scenePreset")
  parts = toolbarParts(tree)
  await clickNode(app, parts.rectangle)

  tree = await getFreshTree(app)
  const assetsPlus = findAssetsPlus(tree)
  await clickNode(app, assetsPlus)
  tree = await waitFor("Assets add menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Create folder") && descendants(next).some((node) => node.text === "Import assets")
      ? next
      : null
  })
  await screenshot(app, "assetsMenu")
  await app.backend.keystrokes(assetsPlus.id, "escape")
  await delay(150)

  // Channel navigation, timeline collapse/restore, and hide/restore are part of this native shell.
  tree = await getFreshTree(app)
  const chatTab = app.getByTestId("diffusion-sidebar-tab-chat")
  await chatTab.waitFor()
  await chatTab.click()
  tree = await waitFor("Chat composer", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.type === "textarea") ? next : null
  })
  await delay(400)
  tree = await getFreshTree(app)
  assert(descendants(tree).some((node) => node.type === "textarea"), "Chat composer disappeared after settling")
  assertText(tree, "GPUix Markdown", "rendered assistant Markdown heading")
  assertText(tree, "Bold item", "rendered assistant Markdown strong text")
  assertText(tree, "Safe link", "rendered assistant Markdown link")
  assertText(tree, "A", "rendered assistant Markdown table header")
  assertText(tree, "1", "rendered assistant Markdown table cell")
  assertChatTableRows(tree)
  assert(
    !descendants(tree).some((node) => (node.text ?? "").includes("GPUix unsafe")),
    "Sanitized assistant Markdown retained script contents",
  )

  await screenshot(app, "chatMarkdown")
  const chatComposer = app.getByType("textarea")
  await chatComposer.fill("GPUix chat smoke")
  await delay(120)
  tree = await getFreshTree(app)
  assert(descendants(tree).some((node) => node.type === "textarea"), "Chat composer disappeared after native text input")
  await screenshot(app, "chat")
  assert(
    !readFileSync(screenshots.chatMarkdown).equals(readFileSync(screenshots.chat)),
    "Chat composer input did not produce a visible native frame",
  )
  const assetsTabs = descendants(tree).filter(
    (node) =>
      node.testId === "diffusion-sidebar-tab-assets"
      && node.bounds
      && node.bounds.width > 0
      && node.bounds.height > 0,
  )
  assert(
    assetsTabs.length > 0,
    "Could not find a painted Assets sidebar tab after Chat interaction",
  )
  await clickNode(app, assetsTabs[0])
  tree = await waitFor("Assets restored after Chat navigation", async () => {
    const nextTree = await currentTree(app)
    return descendants(nextTree).some((node) => (node.text ?? "").includes("Generate with AI"))
      ? nextTree
      : null
  })
  assertText(tree, "Generate with AI", "Assets restored after Chat navigation")
  assert(!descendants(tree).some((node) => node.type === "textarea"), "Chat composer remained mounted after returning to Assets")

  const currentTimeline = getEditorCanvases(tree).find((node) => node.id === timeline.id)
  assert(currentTimeline?.bounds, "Timeline canvas disappeared before minimize/restore acceptance")
  const timelineHeight = currentTimeline.bounds.height
  tree = await openProjectMenu(app)
  await physicalClick(app, { x: (findText(tree, "View")).bounds.x + 20, y: (findText(tree, "View")).bounds.y + 6 })
  tree = await waitFor("View menu timeline toggle", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Toggle timeline") ? next : null
  })
  await clickNode(app, findText(tree, "Toggle timeline"))
  await delay(180)
  tree = await getFreshTree(app)
  let collapsedTimeline = getEditorCanvases(tree).find((node) => node.id === timeline.id)
  assert(!collapsedTimeline || collapsedTimeline.bounds.height < timelineHeight, "Timeline did not minimize")
  tree = await openProjectMenu(app)
  await physicalClick(app, { x: findText(tree, "View").bounds.x + 20, y: findText(tree, "View").bounds.y + 6 })
  tree = await waitFor("View menu timeline restore", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Toggle timeline") ? next : null
  })
  await clickNode(app, findText(tree, "Toggle timeline"))
  await delay(180)
  tree = await getFreshTree(app)
  const restoredTimeline = getEditorCanvases(tree).find((node) => node.id === timeline.id)
  assert(restoredTimeline?.bounds && restoredTimeline.bounds.height >= timelineHeight - 2, "Timeline did not restore to its previous height")

  // Hide and restore the full editor chrome; the floating header is the only
  // expected control while the sidebars and timeline chrome are hidden.
  tree = await openProjectMenu(app)
  await clickNode(app, findText(tree, "View"))
  tree = await waitFor("View menu UI toggle", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Toggle UI") ? next : null
  })
  await clickNode(app, findText(tree, "Toggle UI"))
  tree = await waitFor("hidden editor UI", async () => {
    const next = await currentTree(app)
    return !descendants(next).some((node) => node.text === "Assets") ? next : null
  })
  await screenshot(app, "hiddenUi")
  const floatingHeader = findNode(tree, (node) => node.type === "text" && node.text === "Diffusion Studio", "floating project header")
  const headerParents = indexParents(tree)
  let floatingParent = headerParents.get(floatingHeader.id)
  while (floatingParent && !(floatingParent.bounds?.y < 60 && floatingParent.bounds?.height >= 30 && floatingParent.bounds?.height <= 48 && floatingParent.bounds?.width >= 120 && floatingParent.bounds?.width < 320)) {
    floatingParent = headerParents.get(floatingParent.id)
  }
  assert(floatingParent, "Could not identify the floating project header from native bounds")
  const headerBounds = floatingParent.bounds
  const titleRight = floatingHeader.bounds.x + floatingHeader.bounds.width
  const restoreTarget = descendants(floatingParent)
    .filter((node) => {
      const bounds = node.bounds
      return bounds && bounds.x >= titleRight - 2 && bounds.y >= headerBounds.y && bounds.y + bounds.height <= headerBounds.y + headerBounds.height
        && bounds.width >= 16 && bounds.height >= 16 && bounds.width <= 48 && bounds.height <= 40
    })
    .sort((left, right) => left.bounds.width * left.bounds.height - right.bounds.width * right.bounds.height)[0]
  assert(restoreTarget, `Floating header did not expose the restore-UI control: ${JSON.stringify(descendants(floatingParent).map((node) => ({ type: node.type, text: node.text, bounds: node.bounds })))}`)
  await clickNode(app, restoreTarget)
  tree = await waitFor("restored editor UI", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Assets") ? next : null
  })

  // The fixture has no audio-bearing source. This checks only the required resume() shim contract.
  const timelineNode = restoredTimeline
  const timelineParents = indexParents(tree)
  let rulerHeader = timelineNode
  while (rulerHeader && !(rulerHeader.children ?? []).some((node) => node.bounds?.y > timelineNode.bounds.y && node.bounds?.height >= 80)) {
    rulerHeader = timelineParents.get(rulerHeader.id)
  }
  const leftPanel = descendants(tree).find((node) => node.bounds?.x === 0 && node.bounds?.y === timelineNode.bounds.y && node.bounds?.width >= 240 && node.bounds?.width <= 280)
  const playButton = leftPanel?.children?.flatMap((node) => descendants(node)).find((node) => node.bounds?.x < 40 && node.bounds?.y >= timelineNode.bounds.y + 30 && node.bounds?.height >= 20)
  assert(playButton, "Could not identify timeline Play from the transport's native bounds")
  await clickNode(app, playButton)
  await delay(250)
  await clickNode(app, playButton)
  await delay(150)

  const fatalOutput = [...stderrChunks, ...stdoutLogChunks].join("")
  const foundFatal = fatalPatterns.filter((pattern) => pattern.test(fatalOutput))
  assert(foundFatal.length === 0, `Native runtime emitted a fatal signature: ${foundFatal.map(String).join(", ")}\n${fatalOutput}`)
  persistPerformanceReport()
  await screenshot(app, "final")
  console.log("solid1 Diffusion live-native acceptance: PASSED")
  console.log("solid1 Diffusion native performance:", JSON.stringify(performanceReport))
  console.log(JSON.stringify({
    initialStageBounds: stage.bounds,
    timelineBounds: restoredTimeline.bounds,
    checks: [
      "initial EditorPage and both canvases paint",
      "layer-row selection updates the Inspector; section headings, Position X input, and Inspector wheel interaction work",
      "Rectangle toolbar activation plus draw, move, and resize keep the HUD and native engine responsive",
      "Generate with AI mounts and closes without submitting",
      "Text placement, native textarea entry, and Enter commit",
      "timeline layer wheel scrolling, ruler seek, and ruler drag work without transform errors",
      "blank-stage marquee drag completes",
      "project/View and Inspector zoom dropdowns open as anchored native layers and execute actions",
      "EngineCanvas ctrl-wheel zoom changes camera scale and restores deterministically",
      "Move/Hand dropdown opens and both choices work",
      "Assets plus menu opens",
      "layer context menu opens and closes without destructive selection",
      "Assets/Chat navigation, sanitized assistant Markdown table geometry, Chat composer input, and timeline minimize/restore work",
      "Hide/restore UI removes and restores the editor chrome",
      "fixture Play/Pause traverses AudioContext.resume() without claiming real audio playback",
    ],
    screenshots,
    performance: performanceReport,
    performancePath,
    nonFatalStderr: stderrChunks.join("").split("\n").filter(Boolean),
  }, null, 2))
} catch (error) {
  const stderr = stderrChunks.join("").trim()
  const diagnostics = matchingDiagnostics([...stderrChunks, ...stdoutLogChunks].join(""))
  if (stderr && error instanceof Error) error.message += `\n\nNative stderr:\n${stderr}`
  if (diagnostics.length && error instanceof Error) error.message += `\n\nMatched native/runtime diagnostics:\n${diagnostics.join("\n---\n")}`
  performanceReport.failure = {
    message: error instanceof Error ? error.message : String(error),
  }
  persistPerformanceReport()
  throw error
} finally {
  if (app) await app.close().catch(() => {})
  if (!child.killed) child.kill()
  await Promise.race([exited, delay(1_000)])
}
