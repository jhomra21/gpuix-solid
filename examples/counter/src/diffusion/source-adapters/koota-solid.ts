import { useSourceDiffusionState } from "./runtime"

export function useWorld() {
  return { state: useSourceDiffusionState() }
}
