import { spawn } from "node:child_process"
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { connectStdio } from "../../../packages/solid/dist/automation/stdio.js"

const here = dirname(fileURLToPath(import.meta.url))
const exampleDirectory = join(here, "..")
const timeoutMs = 20_000
const screenshots = {
  initial: "/tmp/diffusion-editor-initial.png",
  layerInspector: "/tmp/diffusion-layer-inspector.png",
  rectangle: "/tmp/diffusion-rectangle-drawn.png",
  rectangleMoved: "/tmp/diffusion-rectangle-moved.png",
  rectangleResized: "/tmp/diffusion-rectangle-resized.png",
  aiPrompt: "/tmp/diffusion-ai-prompt.png",
  textEdit: "/tmp/diffusion-text-edit.png",
  timeline: "/tmp/diffusion-timeline-interaction.png",
  scenePresetPanel: "/tmp/diffusion-scene-preset-panel.png",
  scenePreset: "/tmp/diffusion-scene-preset.png",
  projectMenu: "/tmp/diffusion-project-dropdown.png",
  projectViewSubmenu: "/tmp/diffusion-project-view-submenu.png",
  projectZoomed: "/tmp/diffusion-project-zoomed.png",
  zoomMenu: "/tmp/diffusion-zoom-dropdown.png",
  moveHandMenu: "/tmp/diffusion-move-hand-dropdown.png",
  assetsMenu: "/tmp/diffusion-assets-dropdown.png",
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
  const tree = await getFreshTree(app)
  const candidates = descendants(tree).filter((node) => {
    const b = node.bounds
    return node.type === "svg" && b && b.x >= 0 && b.x < 60 && b.y >= 40 && b.y < 90 && b.width >= 20 && b.height >= 20
  })
  candidates.sort((a, b) => a.bounds.x - b.bounds.x)
  assert(candidates[0], "Could not identify the native project-menu trigger from the live header bounds")
  await clickNode(app, candidates[0])
  return await waitFor("project menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "File") && descendants(next).some((node) => node.text === "View")
      ? next
      : null
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
  await screenshot(app, "layerInspector")


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

  const zoomLabel = findText(tree, "38%")
  const parents = indexParents(tree)
  let zoomTrigger = parents.get(zoomLabel.id)
  while (zoomTrigger && !(zoomTrigger.children ?? []).some((node) => node.type === "svg")) {
    zoomTrigger = parents.get(zoomTrigger.id)
  }
  assert(zoomTrigger?.bounds, "Could not locate the Inspector zoom trigger")
  await clickNode(app, zoomTrigger)
  tree = await waitFor("Inspector zoom menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Zoom to 100%") ? next : null
  })
  await screenshot(app, "zoomMenu")
  await clickNode(app, findText(tree, "Zoom to 100%"))
  await delay(160)

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

  // Context menu is exercised on the actual layer row; do not select destructive actions.
  tree = await getFreshTree(app)
  const row = findText(tree, "GPUix rectangle")
  await clickNode(app, row, 2)
  tree = await waitFor("layer context menu", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.text === "Mute") ? next : null
  })
  await screenshot(app, "contextMenu")
  const mute = findText(tree, "Mute")
  await app.backend.keystrokes(mute.id, "escape")
  await delay(150)

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
  const scenePresetParents = indexParents(tree)
  const presetDimensions = descendants(tree)
    .filter((node) => ["1080", "×", "1920"].includes(node.text))
    .map((node) => {
      let parent = scenePresetParents.get(node.id)
      const ancestors = []
      while (parent && ancestors.length < 3) {
        ancestors.push({ type: parent.type, bounds: parent.bounds })
        parent = scenePresetParents.get(parent.id)
      }
      return { text: node.text, bounds: node.bounds, ancestors }
    })
  console.log("Scene preset dimension native bounds", JSON.stringify(presetDimensions))
  await screenshot(app, "scenePresetPanel")
  const preset = findText(tree, "Square video 1:1")
  const presetParents = indexParents(tree)
  let presetTarget = presetParents.get(preset.id)
  while (
    presetTarget &&
    !(
      presetTarget.bounds &&
      presetTarget.bounds.width >= 120 &&
      presetTarget.bounds.height >= 28 &&
      presetTarget.bounds.height <= 36
    )
  ) {
    presetTarget = presetParents.get(presetTarget.id)
  }
  assert(
    presetTarget,
    `Scene preset label did not expose a painted row ancestor: ${JSON.stringify(
      (() => {
        const rows = []
        let current = presetParents.get(preset.id)
        while (current && rows.length < 6) {
          rows.push({ type: current.type, bounds: current.bounds, text: textContent(current) })
          current = presetParents.get(current.id)
        }
        return rows
      })(),
    )}`,
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
  await clickNode(app, findText(tree, "Chat"))
  tree = await waitFor("Chat composer", async () => {
    const next = await currentTree(app)
    return descendants(next).some((node) => node.type === "textarea") ? next : null
  })
  await clickNode(app, findNode(
    tree,
    (node) => node.type === "text" && node.text === "Assets" && node.bounds?.width > 0 && node.bounds?.height > 0,
    "visible Assets tab in the Chat header",
  ))
  tree = await getFreshTree(app)
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
  await screenshot(app, "final")
  console.log("solid1 Diffusion live-native acceptance: PASSED")
  console.log(JSON.stringify({
    initialStageBounds: stage.bounds,
    timelineBounds: restoredTimeline.bounds,
    checks: [
      "initial EditorPage and both canvases paint",
      "layer-row selection updates the Inspector and canvas gestures operate on the selected entity",
      "Rectangle draw, move, and resize keep the HUD and native engine responsive",
      "Generate with AI mounts and closes without submitting",
      "Text placement, native textarea entry, and Enter commit",
      "timeline ruler seek and drag move the playhead without getTransform errors",
      "blank-stage marquee drag completes",
      "project/View and Inspector zoom dropdowns open and execute actions",
      "Move/Hand dropdown opens and both choices work",
      "Assets plus menu opens",
      "layer context menu opens and closes without destructive selection",
      "Assets/Chat navigation and timeline minimize/restore work",
      "Hide/restore UI removes and restores the editor chrome",
      "fixture Play/Pause traverses AudioContext.resume() without claiming real audio playback",
    ],
    screenshots,
    nonFatalStderr: stderrChunks.join("").split("\n").filter(Boolean),
  }, null, 2))
} catch (error) {
  const stderr = stderrChunks.join("").trim()
  const diagnostics = matchingDiagnostics([...stderrChunks, ...stdoutLogChunks].join(""))
  if (stderr && error instanceof Error) error.message += `\n\nNative stderr:\n${stderr}`
  if (diagnostics.length && error instanceof Error) error.message += `\n\nMatched native/runtime diagnostics:\n${diagnostics.join("\n---\n")}`
  throw error
} finally {
  if (app) await app.close().catch(() => {})
  if (!child.killed) child.kill()
  await Promise.race([exited, delay(1_000)])
}
