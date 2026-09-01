import { useSourceDiffusionState } from "./runtime"

export function useWorld() {
  const state = useSourceDiffusionState()
  return {
    state,
    set: (_component: unknown, next: { value: string }) => {
      if (next.value === "frame" || next.value === "text" || next.value === "rect") {
        state.setSelectedTool(next.value)
      }
    },
  }
}
