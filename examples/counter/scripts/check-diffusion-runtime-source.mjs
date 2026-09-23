import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const DIFFUSION_REPOSITORY = "https://github.com/diffusionstudio/editor.git"
const DIFFUSION_COMMIT = "666cdced1f6b97a792b63e551f45797649efb27a"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const sourceRoot = join(repoRoot, ".cache", "diffusion-editor", DIFFUSION_COMMIT.slice(0, 12))

function run(command, args, cwd = repoRoot, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  })
}

function ensureSource() {
  if (!existsSync(join(sourceRoot, ".git"))) {
    mkdirSync(sourceRoot, { recursive: true })
    run("git", ["init"], sourceRoot)
    run("git", ["remote", "add", "origin", DIFFUSION_REPOSITORY], sourceRoot)
  }

  const current = (() => {
    try {
      return String(run("git", ["rev-parse", "HEAD"], sourceRoot, true)).trim()
    } catch {
      return ""
    }
  })()

  if (current !== DIFFUSION_COMMIT) {
    run("git", ["fetch", "--depth=1", "origin", DIFFUSION_COMMIT], sourceRoot)
    run("git", ["checkout", "--detach", DIFFUSION_COMMIT], sourceRoot)
  }

  const head = String(run("git", ["rev-parse", "HEAD"], sourceRoot, true)).trim()
  if (head !== DIFFUSION_COMMIT) {
    throw new Error(`Diffusion source pin mismatch: expected ${DIFFUSION_COMMIT}, got ${head}`)
  }

  const runtimeMarker = join(sourceRoot, "node_modules", "koota", "package.json")
  const solidMarker = join(sourceRoot, "node_modules", "solid-js", "package.json")
  if (!existsSync(runtimeMarker) || !existsSync(solidMarker)) {
    run("bun", [
      "install",
      "--ignore-scripts",
      "--filter",
      "@diffusionstudio/runtime",
      "--filter",
      "@diffusionstudio/reconciler",
      "--filter",
      "@diffusionstudio/jsx",
      "--filter",
      "@diffusionstudio/assets",
    ], sourceRoot)
  }
}

function sourceModule(relativePath) {
  return pathToFileURL(join(sourceRoot, relativePath)).href
}

function localModule(relativePath) {
  return pathToFileURL(join(repoRoot, relativePath)).href
}

ensureSource()

if (typeof globalThis.HTMLElement === "undefined") {
  globalThis.HTMLElement = class HTMLElement {}
}
if (typeof globalThis.HTMLCanvasElement === "undefined") {
  globalThis.HTMLCanvasElement = class HTMLCanvasElement extends globalThis.HTMLElement {}
}
if (typeof globalThis.HTMLImageElement === "undefined") {
  globalThis.HTMLImageElement = class HTMLImageElement extends globalThis.HTMLElement {}
}

const runtime = await import(sourceModule("packages/runtime/src/index.ts"))
const { createRuntimeDocument } = await import(sourceModule("packages/reconciler/src/document.ts"))
const {
  CANVAS_DRAW_LIST_VERSION,
  createCanvas2DRecorder,
} = await import(localModule("packages/solid/src/host/canvas.ts"))

const width = 320
const height = 180
const recorder = createCanvas2DRecorder(
  () => ({ width, height }),
  undefined,
  (text, fontSize) => String(text).length * fontSize * 0.55,
)

const canvas = { width, height }
const world = runtime.createRuntimeWorld("gpuix-diffusion-runtime-source-smoke")
world.set(runtime.Mode, { value: "offline-video" })
world.set(runtime.FrameRate, { value: 30 })
world.set(runtime.RenderSurface, {
  canvas,
  ctx: recorder.context,
  resolution: 1,
})

const document = createRuntimeDocument(world)

try {
  const scene = document.createElement("Scene")
  document.setProperty(scene, "name", "GPUix source smoke")
  document.setProperty(scene, "width", width)
  document.setProperty(scene, "height", height)
  document.setProperty(scene, "fill", "#111827")
  document.setProperty(scene, "active", true)
  document.insertNode(document.stage, scene)

  const rect = document.createElement("Rect")
  document.setProperty(rect, "x", 36)
  document.setProperty(rect, "y", 28)
  document.setProperty(rect, "width", 180)
  document.setProperty(rect, "height", 96)
  document.setProperty(rect, "fill", "#F43F5E")
  document.setProperty(rect, "cornerRadiusTopLeft", 18)
  document.setProperty(rect, "cornerRadiusTopRight", 6)
  document.setProperty(rect, "cornerRadiusBottomRight", 14)
  document.setProperty(rect, "cornerRadiusBottomLeft", 2)
  document.insertNode(scene, rect)

  runtime.playbackSystem(world)
  runtime.motionSystem(world)
  runtime.transformSystem(world)
  runtime.renderSystem(world)

  const drawList = recorder.snapshot()
  if (drawList.version !== CANVAS_DRAW_LIST_VERSION) {
    throw new Error(
      `Diffusion runtime rendered Canvas protocol ${drawList.version}, expected ${CANVAS_DRAW_LIST_VERSION}`,
    )
  }

  const sceneFill = drawList.commands.find(
    (command) => command.op === "fillPath" && command.color === "#111827",
  )
  if (!sceneFill || sceneFill.op !== "fillPath") {
    throw new Error(`Diffusion scene fill did not reach GPUix Canvas: ${JSON.stringify(drawList)}`)
  }

  const rectFill = drawList.commands.find(
    (command) => command.op === "fillPath" && command.color === "#F43F5E",
  )
  if (!rectFill || rectFill.op !== "fillPath") {
    throw new Error(`Diffusion rect fill did not reach GPUix Canvas: ${JSON.stringify(drawList)}`)
  }

  const cubicCorners = rectFill.path.filter((segment) => segment.op === "bezierCurveTo")
  if (cubicCorners.length !== 4) {
    throw new Error(
      `Diffusion mixed-corner rect should lower through four arcTo cubics, got ${cubicCorners.length}`,
    )
  }

  if (!rectFill.clip) {
    throw new Error("Diffusion scene clipping did not reach the GPUix Canvas command")
  }

  console.log(JSON.stringify({
    diffusionCommit: DIFFUSION_COMMIT,
    canvasProtocol: drawList.version,
    commands: drawList.commands.length,
    mixedCornerCubics: cubicCorners.length,
    clipped: true,
    runtime: "real-source",
    reconciler: "real-source",
  }))
} finally {
  document.dispose()
  world.destroy()
}
