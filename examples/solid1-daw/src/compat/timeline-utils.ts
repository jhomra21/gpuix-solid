export const FX_PANEL_HEIGHT_PX = 360
export const ARRANGEMENT_OVERVIEW_HEIGHT = 24
export const RULER_HEIGHT = 32
export const LANE_HEIGHT = 96
export const TIMELINE_HEADER_HEIGHT = ARRANGEMENT_OVERVIEW_HEIGHT + RULER_HEIGHT
export const DEFAULT_AUTOMATION_LANE_HEIGHT = 96
export const GROUP_INDENT_PX = 12
export const GROUP_RAIL_WIDTH = 4

export function quantizeSecToGrid(
  sec: number,
  bpm: number,
  denominator: number,
  mode: "round" | "floor" | "ceil" = "round",
): number {
  const step = 60 / Math.max(1, bpm) * 4 / Math.max(1, denominator)
  const units = sec / step
  const snapped = mode === "floor" ? Math.floor(units) : mode === "ceil" ? Math.ceil(units) : Math.round(units)
  return Math.max(0, snapped * step)
}
