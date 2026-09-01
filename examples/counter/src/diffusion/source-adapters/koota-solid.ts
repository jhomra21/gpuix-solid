import { Tool } from "./diffusion-runtime"
import { useSourceDiffusionState } from "./runtime"

export function useWorld() {
  const state = useSourceDiffusionState()
  return {
    state,
    set: (component: typeof Tool, next: { value: string }) => {
      if (component !== Tool) return
      if (next.value === "frame" || next.value === "text" || next.value === "rect") {
        state.setSelectedTool(next.value)
      }
    },
  }
}
