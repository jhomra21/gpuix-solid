import type { DiffusionTool } from "../compat"
import { useSourceDiffusionState } from "./runtime"

export function useWorld() {
  const state = useSourceDiffusionState()
  return {
    state,
    set: (_component: unknown, value: { value: DiffusionTool }) => state.setSelectedTool(value.value),
  }
}
