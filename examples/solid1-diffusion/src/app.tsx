import { onCleanup, onMount, type JSX } from "solid-js"
import { configureNativeStyleManifest } from "@jhomra21/gpuix-solid1"
import { EngineCanvas } from "@/engine/canvas"
import { CameraController } from "@/engine/camera-controller"
import { EngineProvider, useEngineContext } from "@/engine/context"
import { mount, type Mount } from "@diffusionstudio/reconciler"
import {
  getActiveEntity,
  getCamera,
  Name,
  RenderSurface,
  Tool,
  ToolType,
  type RuntimeWorld,
} from "@diffusionstudio/runtime"

configureNativeStyleManifest({
  classes: {
    relative: { base: { position: "relative" } },
    "size-full": { base: { width: "100%", height: "100%" } },
    absolute: { base: { position: "absolute" } },
    "inset-0": { base: { top: 0, right: 0, bottom: 0, left: 0 } },
  },
})

const projectBundle = `
const {
  createComponent,
  Stage,
  Scene,
  Rect,
} = require("@diffusionstudio/jsx");

module.exports.default = function Project() {
  return createComponent(Stage, {
    get children() {
      return createComponent(Scene, {
        name: "GPUix Diffusion source",
        width: 640,
        height: 360,
        fill: "#0F172A",
        active: true,
        get children() {
          return createComponent(Rect, {
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
}

export const diffusionSourceProbe: DiffusionSourceProbe = {
  world: null,
  mounted: null,
  frame: null,
}

function ProjectMount(): JSX.Element {
  const engine = useEngineContext()
  diffusionSourceProbe.world = engine.world
  diffusionSourceProbe.frame = engine.frame

  let mounted: Mount | undefined
  onMount(() => {
    mounted = mount(projectBundle, engine.world)
    diffusionSourceProbe.mounted = mounted
  })
  onCleanup(() => {
    mounted?.dispose()
    diffusionSourceProbe.mounted = null
    diffusionSourceProbe.world = null
    diffusionSourceProbe.frame = null
  })

  return (
    <>
      <EngineCanvas />
      <CameraController />
    </>
  )
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
    <EngineProvider projectId="gpuix-diffusion-source">
      <div
        testId="diffusion-source-engine"
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
      >
        <ProjectMount />
      </div>
    </EngineProvider>
  )
}

export function armDiffusionSourceHandTool(): void {
  const world = diffusionSourceProbe.world
  if (!world) throw new Error("Diffusion source world is not mounted")
  world.set(Tool, { value: ToolType.HAND })
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
