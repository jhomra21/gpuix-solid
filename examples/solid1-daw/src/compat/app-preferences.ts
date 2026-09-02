export const TIMELINE_DEFAULT_TRACK_COLOR = "timeline-surface"
export const TIMELINE_DEFAULT_GROUP_COLOR = "timeline-surface"

const themeTokens = {
  "clip-audio": "#00a76c",
  "clip-midi": "#0089ed",
  "clip-recording": "#ef4444",
  "clip-selected": "#60a5fa",
  "timeline-background": "#09090b",
  "timeline-surface": "#18181b",
  "timeline-surface-muted": "#27272a",
  "timeline-grid-major": "#3f3f46",
  "timeline-grid-minor": "#27272a",
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
