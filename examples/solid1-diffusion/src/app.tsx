import { onCleanup, onMount, type JSX } from "solid-js"
import { EngineCanvas } from "@/engine/canvas"
import { EngineProvider, useEngineContext } from "@/engine/context"
import { mount, type Mount } from "@diffusionstudio/reconciler"
import {
  AdjustmentLayer,
  getActiveEntity,
  Name,
  RenderSurface,
  type RuntimeWorld,
} from "@diffusionstudio/runtime"

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
}

export const diffusionSourceProbe: DiffusionSourceProbe = {
  world: null,
  mounted: null,
}

function ProjectMount(): JSX.Element {
  const engine = useEngineContext()
  diffusionSourceProbe.world = engine.world

  // Diffusion 0.206.0 uses an Or(Geometry, Group, AdjustmentLayer) cache query
  // that crosses Koota 0.6.6 bitmask generations unless this trait is known
  // before the project document is mounted.
  engine.world.query(AdjustmentLayer)

  let mounted: Mount | undefined
  onMount(() => {
    mounted = mount(projectBundle, engine.world)
    diffusionSourceProbe.mounted = mounted
  })
  onCleanup(() => {
    mounted?.dispose()
    diffusionSourceProbe.mounted = null
    diffusionSourceProbe.world = null
  })

  return <EngineCanvas />
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

export function readDiffusionSourceState() {
  const world = diffusionSourceProbe.world
  const scene = world ? getActiveEntity(world) : null
  const surface = world?.get(RenderSurface)
  return {
    sceneName: scene?.get(Name)?.value ?? null,
    canvas: surface?.canvas ?? null,
    context: surface?.ctx ?? null,
  }
}
