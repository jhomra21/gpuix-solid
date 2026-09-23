export * from "@diffusionstudio/runtime-source"

import {
  AdjustmentLayer,
  createRuntimeWorld as createSourceRuntimeWorld,
} from "@diffusionstudio/runtime-source"

/**
 * Diffusion 0.206.0 runs on Koota 0.6.6. Its Or(...) matcher evaluates each
 * bitmask generation independently, so AdjustmentLayer must be registered in
 * the runtime world before the editor adds its own traits. Keeping this at the
 * module boundary preserves the upstream Engine and runtime source unchanged.
 */
export function createRuntimeWorld(projectId: string) {
  const world = createSourceRuntimeWorld(projectId)
  world.query(AdjustmentLayer)
  return world
}
