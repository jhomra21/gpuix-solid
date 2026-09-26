export * from "@diffusionstudio/runtime-source"

import { createWorld, Or } from "koota"
import {
  AdjustmentLayer,
  Ai,
  AudioEngine,
  Background,
  Camera,
  Fonts,
  FramePromises,
  FrameRate,
  Geometry,
  Group,
  HitRegions,
  Library,
  Mode,
  observeWorld,
  Project,
  RenderSurface,
  Root,
  Stage,
  Tickers,
  Time,
  Tool,
} from "@diffusionstudio/runtime-source"

/**
 * Diffusion 0.206.0 runs on Koota 0.6.6, whose Or(...) bitmask check is scoped
 * per trait generation. Register the render-node union before observeWorld()
 * and before the editor layers on its own traits so the three alternatives
 * stay in one generation. The rest of createRuntimeWorld is upstream source.
 */
export function createRuntimeWorld(projectId: string) {
  const world = createWorld(
    Project({ id: projectId }),
    Mode,
    Time,
    FrameRate,
    RenderSurface,
    AudioEngine,
    Fonts,
    Library,
    Ai,
    Tickers,
    FramePromises,
    HitRegions,
    Tool,
    Root,
  )

  world.query(Or(Geometry, Group, AdjustmentLayer))
  world.set(Root, world.spawn(Stage, Camera, Background))
  observeWorld(world)

  return world
}
