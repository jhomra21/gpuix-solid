export const FX_PANEL_HEIGHT_PX = 360
export const ARRANGEMENT_OVERVIEW_HEIGHT = 24
export const RULER_HEIGHT = 32
export const TIMELINE_HEADER_HEIGHT = ARRANGEMENT_OVERVIEW_HEIGHT + RULER_HEIGHT
export const LANE_HEIGHT = 96
export const COLLAPSED_LANE_HEIGHT = 32
export const GROUP_INDENT_PX = 16
export const GROUP_RAIL_WIDTH = 4
export const DEFAULT_AUTOMATION_LANE_HEIGHT = 48

export function quantizeSecToGrid(
  sec: number,
  bpm: number,
  denom: number,
  mode: "round" | "floor" | "ceil" = "round",
): number {
  const safeBpm = Math.max(1e-6, bpm || 0)
  const step = (60 / safeBpm) * (4 / Math.max(1, denom || 4))
  if (!Number.isFinite(step) || step <= 0) return Math.max(0, sec)
  const idx = sec / step
  let snappedIdx = idx
  if (mode === "floor") snappedIdx = Math.floor(idx)
  else if (mode === "ceil") snappedIdx = Math.ceil(idx)
  else snappedIdx = Math.round(idx)
  return Math.max(0, snappedIdx * step)
}
