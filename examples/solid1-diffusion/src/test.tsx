import { CANVAS_DRAW_LIST_VERSION, createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { ToolType } from "@diffusionstudio/runtime"
import { loadDiffusionNativeApp } from "./bootstrap"

const {
  armDiffusionSourceHandTool,
  DiffusionSourceEditor,
  DiffusionSourceEngine,
  readDiffusionSourceEditorState,
  readDiffusionSourceEdits,
  readDiffusionSourceSelection,
  readDiffusionSourceState,
  resetDiffusionSourceCamera,
} = await loadDiffusionNativeApp()

const screenshotPath = "/tmp/gpuix-solid1-diffusion-source.png"
const editorScreenshotPath = "/tmp/gpuix-solid1-diffusion-editor.png"

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function closeTo(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) < 0.001
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Diffusion source engine: native TestGpuixRenderer unavailable; skipped")
} else {
  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const app = createTestRoot(1280, 800)
  app.render(() => <DiffusionSourceEngine />)

  try {
    for (let frame = 0; frame < 3; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    await Promise.resolve()
    app.root.flush()
    app.renderer.flush()

    const state = readDiffusionSourceState()
    requireCondition(state.sceneName === "GPUix Diffusion source", "Diffusion source project should mount an active scene")
    requireCondition(state.canvas !== null, "Diffusion EngineCanvas should mount a canvas")
    requireCondition(state.context !== null, "Diffusion EngineCanvas should acquire a 2D context")
    requireCondition(
      state.canvas instanceof HTMLCanvasElement,
      "Diffusion EngineCanvas should retain HTMLCanvasElement identity on GPUIX",
    )
    requireCondition(state.camera !== null, "Diffusion source world should expose the stage camera")

    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(existsSync(screenshotPath), "Diffusion source screenshot should be written")
    requireCondition(statSync(screenshotPath).size > 0, "Diffusion source screenshot should not be empty")

    const canvasBounds = app.renderer.boundsFirstTypeWithinTestId("diffusion-source-engine", "canvas")
    console.log("solid1 Diffusion source state:", JSON.stringify({
      frame: state.frame,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      resolution: state.resolution,
      canvasBounds,
    }))

    const drawList = app.renderer.customPropJsonContainingAll("drawList", [`"version":${CANVAS_DRAW_LIST_VERSION}`])
    console.log("solid1 Diffusion source drawList:", drawList)
    requireCondition(
      drawList.includes("\"color\":\"#22C55E\""),
      "Diffusion source draw list should contain the green project rectangle",
    )

    const beforeCamera = state.camera
    armDiffusionSourceHandTool()
    app.renderer.dragTestId("diffusion-source-engine", 60, 30)

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    app.root.flush()
    app.renderer.flush()

    const panned = readDiffusionSourceState()
    requireCondition(panned.camera !== null, "Diffusion source camera should remain available after a native drag")
    requireCondition(
      closeTo(panned.camera.e - beforeCamera.e, 60),
      `Diffusion CameraController should pan camera x by 60px, got ${panned.camera.e - beforeCamera.e}`,
    )
    requireCondition(
      closeTo(panned.camera.f - beforeCamera.f, 30),
      `Diffusion CameraController should pan camera y by 30px, got ${panned.camera.f - beforeCamera.f}`,
    )

    const pannedDrawList = app.renderer.customPropJsonContainingAll("drawList", [`"version":${CANVAS_DRAW_LIST_VERSION}`])
    requireCondition(
      pannedDrawList.includes("\"color\":\"#22C55E\""),
      "Diffusion project rectangle should still render after CameraController pan",
    )
    console.log("solid1 Diffusion source camera pan:", JSON.stringify({
      before: beforeCamera,
      after: panned.camera,
      delta: {
        x: panned.camera.e - beforeCamera.e,
        y: panned.camera.f - beforeCamera.f,
      },
    }))

    resetDiffusionSourceCamera()
    requireCondition(
      app.renderer.hasTestId("diffusion-toolbar-rectangle"),
      "Diffusion Toolbar should expose its real Rectangle button to native acceptance",
    )
    app.renderer.clickTestId("diffusion-toolbar-rectangle")
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    app.root.flush()
    app.renderer.flush()
    requireCondition(
      readDiffusionSourceEditorState().tool === ToolType.RECT,
      "Diffusion Toolbar Rectangle button should select the real RECT tool",
    )

    const overlay = Array.from(document.body.querySelectorAll("div"))
      .find((element) => element.style.cursor === "crosshair")
    let overlayPointerDowns = 0
    overlay?.addEventListener("pointerdown", () => {
      overlayPointerDowns += 1
    })
    overlay?.setAttribute("testId", "diffusion-draw-overlay")
    app.root.flush()
    app.renderer.flush()
    console.log("solid1 Diffusion source DrawOverlay before:", JSON.stringify({
      overlayBounds: overlay?.getBoundingClientRect() ?? null,
      nativeOverlayStyle: app.renderer.hasTestId("diffusion-draw-overlay")
        ? app.renderer.styleTestId("diffusion-draw-overlay")
        : null,
      editor: readDiffusionSourceEditorState(),
    }))

    app.renderer.dragTestId("diffusion-source-engine", 120, 80)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    app.root.flush()
    app.renderer.flush()

    console.log("solid1 Diffusion source DrawOverlay after:", JSON.stringify({
      overlayPointerDowns,
      editor: readDiffusionSourceEditorState(),
    }))

    const selection = readDiffusionSourceSelection()
    requireCondition(selection.length === 1, `Diffusion DrawOverlay should select one inserted rectangle, got ${selection.length}`)
    const [inserted] = selection
    requireCondition(inserted !== undefined, "Diffusion DrawOverlay should return the inserted rectangle")
    requireCondition(inserted.name?.startsWith("Rect") === true, `Expected inserted Rect name, got ${inserted.name}`)
    requireCondition(inserted.width === 120, `Expected inserted Rect width 120, got ${inserted.width}`)
    requireCondition(inserted.height === 80, `Expected inserted Rect height 80, got ${inserted.height}`)
    requireCondition(inserted.source?.startsWith("pending#") === true, `Expected inserted Rect to carry a pending source stamp, got ${inserted.source}`)

    const edits = readDiffusionSourceEdits()
    const insertEdit = edits.find((edit) => edit.kind === "insert" && edit.source === inserted.source)
    requireCondition(insertEdit !== undefined, "Diffusion DrawOverlay should report the inserted rectangle back to the source editor")
    requireCondition(insertEdit.parent === "project.tsx:2", `Expected insert edit parent project.tsx:2, got ${insertEdit.parent}`)
    requireCondition(insertEdit.tag === "rect", `Expected insert edit tag rect, got ${insertEdit.tag}`)
    requireCondition(insertEdit.props.width === 120, `Expected insert edit width 120, got ${String(insertEdit.props.width)}`)
    requireCondition(insertEdit.props.height === 80, `Expected insert edit height 80, got ${String(insertEdit.props.height)}`)

    const editedDrawList = app.renderer.customPropJsonContainingAll("drawList", [`"version":${CANVAS_DRAW_LIST_VERSION}`])
    requireCondition(
      editedDrawList.includes("\"color\":\"#E0E0E0\""),
      "Diffusion draw list should contain the rectangle inserted by the real DrawOverlay",
    )

    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(statSync(screenshotPath).size > 0, "Edited Diffusion source screenshot should not be empty")
    console.log("solid1 Diffusion source DrawOverlay insert:", JSON.stringify({ inserted, insertEdit }))

    console.log("solid1 Diffusion source EngineCanvas + CameraController + DrawOverlay: passed")
  } finally {
    app.unmount()
  }

  if (existsSync(editorScreenshotPath)) unlinkSync(editorScreenshotPath)

  const editorApp = createTestRoot(1280, 800)
  editorApp.render(() => <DiffusionSourceEditor />)

  try {
    for (let frame = 0; frame < 4; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    await Promise.resolve()
    editorApp.root.flush()
    editorApp.renderer.flush()

    requireCondition(
      editorApp.renderer.hasTestId("diffusion-source-editor"),
      "Diffusion EditorPage fixture should mount its native editor root",
    )

    const editorBounds = editorApp.renderer.boundsTestId("diffusion-source-editor")
    const windowSize = editorApp.renderer.getWindowSize()
    const stageBounds = editorApp.renderer.boundsFirstTypeWithinTestId("diffusion-source-editor", "canvas")
    const editorText = editorApp.renderer.textContent("diffusion-source-editor")
    const editorLabelBounds = editorApp.renderer.boundsText("Editor")
    const zoomLabelBounds = editorApp.renderer.boundsText("30%")
    requireCondition(
      closeTo(editorBounds.width, windowSize.width) && closeTo(editorBounds.height, windowSize.height),
      `Diffusion EditorPage should fill the granted native window; got ${editorBounds.width}x${editorBounds.height}, window ${windowSize.width}x${windowSize.height}`,
    )
    requireCondition(editorText.includes("Add media"), "Diffusion EditorPage should render the real Assets sidebar")
    requireCondition(
      !editorText.includes("Edit your videos with AI agents"),
      "Diffusion native EditorPage should not render the browser-only desktop app promo",
    )
    requireCondition(stageBounds.width < editorBounds.width, "Diffusion EditorPage stage should leave room for editor sidebars")
    requireCondition(stageBounds.height < editorBounds.height, "Diffusion EditorPage stage should leave room for the timeline")
    requireCondition(
      zoomLabelBounds.x > editorLabelBounds.x + editorLabelBounds.width + 80,
      `Diffusion inspector zoom should stay right-aligned; Editor at ${editorLabelBounds.x}, zoom at ${zoomLabelBounds.x}`,
    )

    const timelineCanvas = Array.from(document.body.querySelectorAll("canvas"))
      .find((element) => element.getAttribute("id") === "timeline-canvas")
    requireCondition(timelineCanvas instanceof HTMLCanvasElement, "Diffusion EditorPage should mount the real timeline canvas")
    timelineCanvas.setAttribute("testId", "diffusion-editor-timeline")
    editorApp.root.flush()
    editorApp.renderer.flush()
    requireCondition(
      editorApp.renderer.hasTestId("diffusion-editor-timeline"),
      "Diffusion timeline canvas should remain connected to the native tree",
    )

    const editorState = readDiffusionSourceState()
    requireCondition(editorState.sceneName === "GPUix Diffusion source", "Diffusion EditorPage should share the mounted project world")
    requireCondition(editorState.canvas instanceof HTMLCanvasElement, "Diffusion EditorPage should mount the real EngineCanvas")

    const editorDrawList = editorApp.renderer.customPropJsonContainingAll("drawList", [`"version":${CANVAS_DRAW_LIST_VERSION}`])
    requireCondition(
      editorDrawList.includes("\"color\":\"#22C55E\""),
      "Diffusion EditorPage canvas should render the project rectangle",
    )

    requireCondition(
      editorApp.renderer.hasTestId("diffusion-toolbar-rectangle"),
      "Diffusion EditorPage should expose the real Rectangle toolbar button",
    )
    editorApp.renderer.clickTestId("diffusion-toolbar-rectangle")
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    editorApp.root.flush()
    editorApp.renderer.flush()
    requireCondition(
      readDiffusionSourceEditorState().tool === ToolType.RECT,
      "Diffusion EditorPage Rectangle button should select the real RECT tool",
    )

    editorApp.renderer.captureScreenshot(editorScreenshotPath)
    requireCondition(existsSync(editorScreenshotPath), "Diffusion EditorPage screenshot should be written")
    requireCondition(statSync(editorScreenshotPath).size > 0, "Diffusion EditorPage screenshot should not be empty")

    console.log("solid1 Diffusion EditorPage shell:", JSON.stringify({
      editorBounds,
      windowSize,
      stageBounds,
      timelineBounds: editorApp.renderer.boundsTestId("diffusion-editor-timeline"),
    }))
    console.log("solid1 Diffusion EditorPage shell: passed")
  } finally {
    editorApp.unmount()
  }
}
