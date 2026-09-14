export const TIMELINE_DEFAULT_TRACK_COLOR = "timeline-surface"
export const TIMELINE_DEFAULT_GROUP_COLOR = "timeline-surface"

// Exact sRGB translations of the pinned DAW branch's default dark theme tokens.
// This adapter supplies deterministic UI data only; it does not reproduce theme persistence.
const themeTokens = {
  "clip-audio": "#00a76c",
  "clip-midi": "#0089ed",
  "clip-recording": "#f53e39",
  "clip-selected": "#e6ad00",
  "timeline-background": "#040405",
  "timeline-surface": "#0d0d0f",
  "timeline-surface-muted": "#1a1a1d",
  "timeline-grid-major": "#ffffff29",
  "timeline-grid-minor": "#ffffff14",
  "muted-foreground": "#9f9fa9",
  "meter-safe": "#00a76c",
  "meter-warning": "#e6ad00",
  "meter-clipping": "#f53e39",
  "device-graph-background": "#040405",
  "device-graph-grid": "#ffffff29",
  "device-graph-accent": "#00c3db",
} as const

export function useAppPreferences() {
  return {
    appearance: {
      themeTokens: () => themeTokens,
    },
    timeline: {
      defaultTrackColor: () => TIMELINE_DEFAULT_TRACK_COLOR,
      defaultTrackColorInput: () => themeTokens["timeline-surface"],
      defaultGroupColor: () => TIMELINE_DEFAULT_GROUP_COLOR,
      defaultGroupColorInput: () => themeTokens["timeline-surface"],
    },
  }
}
