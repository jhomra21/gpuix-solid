import { useSourceDiffusionState } from "./runtime"

export function useCameraScale() {
  return useSourceDiffusionState().zoom
}

export function zoomBy(world: { state: ReturnType<typeof useSourceDiffusionState> }, factor: number): void {
  world.state.setZoom(Math.max(0.1, Math.min(4, world.state.zoom() * factor)))
}

export function zoomTo(world: { state: ReturnType<typeof useSourceDiffusionState> }, value: number): void {
  world.state.setZoom(value)
}

export function zoomToFit(world: { state: ReturnType<typeof useSourceDiffusionState> }): void {
  world.state.setZoom(0.75)
}
