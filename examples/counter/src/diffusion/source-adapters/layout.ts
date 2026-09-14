import { useSourceDiffusionState } from "./runtime"

export function useLayout() {
  const state = useSourceDiffusionState()
  return {
    toggleUI: () => state.setUiVisible(!state.uiVisible()),
    toggleTimeline: () => state.setTimelineMinimized(!state.timelineMinimized()),
  }
}
