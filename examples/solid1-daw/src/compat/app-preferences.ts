const themeTokens = {
  "clip-audio": "#00a76c",
  "clip-midi": "#0089ed",
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
  }
}
