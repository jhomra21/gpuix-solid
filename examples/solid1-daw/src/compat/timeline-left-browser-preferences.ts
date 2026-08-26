import type { TimelineBrowserTab } from "../upstream/components/timeline/browser/browser-types"

export const timelineBrowserTabs: readonly TimelineBrowserTab[] = [
  "assets",
  "effects",
  "midi-instruments",
]

export const timelineBrowserTabLabels = {
  assets: "Assets",
  effects: "Effects",
  "midi-instruments": "MIDI Instruments",
} satisfies Record<TimelineBrowserTab, string>
