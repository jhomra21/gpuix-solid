import type { StyleDesc } from "@jhomra21/gpuix-solid1"

// Exact sRGB translations of the pinned DAW branch's dark OKLCH tokens.
export const dawTheme = {
  background: "#09090b",
  foreground: "#fafafa",
  border: "#27272a",
  muted: "#27272a",
  mutedForeground: "#9f9fa9",
  appSurface: "#0d0d0f",
  appSurfaceMuted: "#161619",
  timelineBackground: "#040405",
  timelineSurface: "#0d0d0f",
  timelineSurfaceMuted: "#1a1a1d",
  timelineGridMinor: "#ffffff14",
  timelineGridMajor: "#ffffff29",
  timelinePlayhead: "#ff6056",
  clipAudio: "#00a76c",
  clipMidi: "#0089ed",
  clipSelected: "#e6ad00",
  meterSafe: "#00a76c",
  meterWarning: "#e6ad00",
  meterClipping: "#f53e39",
  deviceGraphBackground: "#040405",
  deviceGraphGrid: "#ffffff29",
  deviceGraphAccent: "#00c3db",
  recording: "#f53e39",
  automation: "#ff643d",
  blue: "#3b82f6",
  blueSoft: "#60a5fa",
  amber: "#fbbf24",
  red: "#ef4444",
  green: "#4ade80",
} as const

export const layout = {
  windowWidth: 1440,
  browserWidth: 280,
  sidebarWidth: 336,
  overviewHeight: 24,
  rulerHeight: 32,
  headerHeight: 56,
  laneHeight: 96,
  collapsedLaneHeight: 32,
  groupIndent: 16,
  groupRailWidth: 4,
  bottomPanelHeight: 360,
  transportHeight: 45,
} as const

export const textXs: StyleDesc = { fontSize: 12, lineHeight: 16 }
export const textSm: StyleDesc = { fontSize: 14, lineHeight: 20 }
export const text2xs: StyleDesc = { fontSize: 10, lineHeight: 14 }
export const text3xs: StyleDesc = { fontSize: 8, lineHeight: 10 }

export function ghostButton(active = false): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    height: 28,
    minHeight: 28,
    minWidth: 28,
    paddingLeft: 7,
    paddingRight: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: active ? dawTheme.timelineSurfaceMuted : dawTheme.timelineBackground,
    color: active ? dawTheme.foreground : dawTheme.mutedForeground,
    borderRadius: 3,
    cursor: "pointer",
    hover: { backgroundColor: dawTheme.timelineSurfaceMuted, color: dawTheme.foreground },
    active: { opacity: 0.8 },
  }
}

export function borderedControl(): StyleDesc {
  return {
    height: 28,
    minHeight: 28,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: dawTheme.timelineSurface,
    color: dawTheme.foreground,
    borderWidth: 1,
    borderColor: dawTheme.border,
    borderRadius: 0,
    alignItems: "center",
  }
}
