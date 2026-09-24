import "fake-indexeddb/auto"

// Diffusion's browser source opens its project database while the engine barrel loads.
// Keep the source unchanged; this fixture supplies the browser IndexedDB contract in memory
// until durable native project metadata storage gets its own host boundary.
import { onCleanup, onMount, type JSX } from "solid-js"
import { configureNativeStyleManifest } from "@jhomra21/gpuix-solid1"
import { nativeTailwindManifest } from "./native-tailwind.generated"
import { Canvas } from "@/components/canvas/canvas"
import { PromptInputProvider } from "@/context/prompt-input"
import { ProjectProvider } from "@/context/project"
import { EditorApiProvider } from "@/dapi"
import { EngineProvider, useEngineContext } from "@/engine/context"
import { getDocumentEditor, type EntityEdit } from "@/engine/editor"
import { mount, type Mount } from "@diffusionstudio/reconciler"
import {
  findSceneAt,
  getActiveEntity,
  getCamera,
  Name,
  Position,
  RenderSurface,
  Selected,
  setCamera,
  Size,
  Source,
  Tool,
  ToolType,
  type RuntimeWorld,
} from "@diffusionstudio/runtime"

configureNativeStyleManifest(nativeTailwindManifest)

const fixtureProject = {
  id: "gpuix-diffusion-source",
  name: "gpuix-diffusion-source",
  displayName: "GPUix Diffusion source",
  dir: "/gpuix-diffusion-source",
  entry: "project.tsx",
  modifiedAt: "2026-09-23T00:00:00.000Z",
  createdAt: "2026-09-23T00:00:00.000Z",
}

const projectBundle = `
const {
  createComponent,
  Stage,
  Scene,
  Rect,
} = require("@diffusionstudio/jsx");

module.exports.default = function Project() {
  return createComponent(Stage, {
    __source: "project.tsx:1",
    get children() {
      return createComponent(Scene, {
        __source: "project.tsx:2",
        name: "GPUix Diffusion source",
        width: 640,
        height: 360,
        fill: "#0F172A",
        active: true,
        get children() {
          return createComponent(Rect, {
            __source: "project.tsx:3",
            name: "GPUix rectangle",
            x: 120,
            y: 80,
            width: 280,
            height: 160,
            fill: "#22C55E",
            cornerRadius: 20,
          });
        },
      });
    },
  });
};
`

export type DiffusionSourceProbe = {
  world: RuntimeWorld | null
  mounted: Mount | null
  frame: (() => number) | null
  edits: EntityEdit[]
}

export const diffusionSourceProbe: DiffusionSourceProbe = {
  world: null,
  mounted: null,
  frame: null,
  edits: [],
}

function ProjectMount(): JSX.Element {
  const engine = useEngineContext()
  diffusionSourceProbe.world = engine.world
  diffusionSourceProbe.frame = engine.frame

  let mounted: Mount | undefined
  let unsubscribeEdits: (() => void) | undefined
  onMount(() => {
    diffusionSourceProbe.edits = []
    unsubscribeEdits = getDocumentEditor(engine.world).onEdit((edit) => diffusionSourceProbe.edits.push(edit))
    mounted = mount(projectBundle, engine.world)
    diffusionSourceProbe.mounted = mounted

  })
  onCleanup(() => {
    unsubscribeEdits?.()
    mounted?.dispose()
    diffusionSourceProbe.mounted = null
    diffusionSourceProbe.world = null
    diffusionSourceProbe.frame = null
  })

  return <Canvas />
}

class DiffusionAudioContext {
  currentTime = 0
  state = "running"
  destination = {}

  close(): Promise<void> {
    return Promise.resolve()
  }
}

Object.defineProperty(globalThis, "AudioContext", {
  configurable: true,
  writable: true,
  value: DiffusionAudioContext,
})
Object.defineProperty(globalThis.window, "AudioContext", {
  configurable: true,
  writable: true,
  value: DiffusionAudioContext,
})

export function DiffusionSourceEngine(): JSX.Element {
  return (
    <ProjectProvider project={fixtureProject}>
      <EngineProvider projectId={fixtureProject.id}>
        <EditorApiProvider>
          <PromptInputProvider>
            <div
              testId="diffusion-source-engine"
              style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
            >
              <ProjectMount />
            </div>
          </PromptInputProvider>
        </EditorApiProvider>
      </EngineProvider>
    </ProjectProvider>
  )
}

function requireWorld(): RuntimeWorld {
  const world = diffusionSourceProbe.world
  if (!world) throw new Error("Diffusion source world is not mounted")
  return world
}

export function armDiffusionSourceHandTool(): void {
  requireWorld().set(Tool, { value: ToolType.HAND })
}

export function armDiffusionSourceRectTool(): void {
  requireWorld().set(Tool, { value: ToolType.RECT })
}

export function resetDiffusionSourceCamera(): void {
  setCamera(requireWorld(), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
}

export function readDiffusionSourceSelection() {
  const world = requireWorld()
  return [...world.query(Selected)].map((entity) => {
    const position = entity.get(Position)
    const size = entity.get(Size)
    return {
      name: entity.get(Name)?.value ?? null,
      x: position?.x ?? null,
      y: position?.y ?? null,
      width: size?.width ?? null,
      height: size?.height ?? null,
      source: entity.get(Source)?.value ?? null,
    }
  })
}

export function readDiffusionSourceEdits(): EntityEdit[] {
  return [...diffusionSourceProbe.edits]
}

export function readDiffusionSourceEditorState() {
  const world = requireWorld()
  const scene = getActiveEntity(world)
  const hit = findSceneAt(world, 4, 4)

  return {
    tool: world.get(Tool)?.value ?? null,
    sceneHasSource: Boolean(scene?.get(Source)?.value),
    hitSceneName: hit?.get(Name)?.value ?? null,
    hitSceneHasSource: Boolean(hit?.get(Source)?.value),
    names: [...world.query(Name)].map((entity) => entity.get(Name)?.value ?? null),
    selection: readDiffusionSourceSelection(),
  }
}

export function readDiffusionSourceState() {
  const world = diffusionSourceProbe.world
  const scene = world ? getActiveEntity(world) : null
  const surface = world?.get(RenderSurface)
  const camera = world ? getCamera(world) : null

  return {
    sceneName: scene?.get(Name)?.value ?? null,
    canvas: surface?.canvas ?? null,
    context: surface?.ctx ?? null,
    frame: diffusionSourceProbe.frame?.() ?? null,
    canvasWidth: surface?.canvas?.width ?? null,
    canvasHeight: surface?.canvas?.height ?? null,
    resolution: surface?.resolution ?? null,
    camera: camera
      ? { a: camera.a, b: camera.b, c: camera.c, d: camera.d, e: camera.e, f: camera.f }
      : null,
  }
}
