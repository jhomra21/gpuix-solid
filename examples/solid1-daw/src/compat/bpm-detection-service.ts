import type { AudioWarp, Clip } from "../upstream/packages/timeline-core/types"

export type BpmDetectionResult = {
  bpm: number
  confidence: number
  alternatives: { bpm: number; confidence: number }[]
}

export type BpmSuggestionState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "suggested"; result: BpmDetectionResult }
  | { status: "applied"; result: BpmDetectionResult }
  | { status: "failed"; message: string }

type Listener = () => void
type AnalyzeClipInput = {
  clip: Pick<Clip, "id" | "audioWarp">
  canWrite: boolean
  autoApply: (audioWarp: AudioWarp) => Promise<boolean>
}

const RESULT: BpmDetectionResult = {
  bpm: 118,
  confidence: 0.94,
  alternatives: [
    { bpm: 59, confidence: 0.62 },
    { bpm: 236, confidence: 0.58 },
  ],
}

export function createBpmDetectionService() {
  const states = new Map<string, BpmSuggestionState>()
  const listeners = new Set<Listener>()
  const notify = () => { for (const listener of listeners) listener() }
  const setState = (clipId: string, state: BpmSuggestionState) => { states.set(clipId, state); notify() }

  return {
    analyzeClip: async (input: AnalyzeClipInput) => {
      setState(input.clip.id, { status: "analyzing" })
      await Promise.resolve()
      if (input.canWrite) {
        const applied = await input.autoApply({ enabled: true, sourceBpm: RESULT.bpm, mode: "stretch" })
        setState(input.clip.id, applied ? { status: "applied", result: RESULT } : { status: "suggested", result: RESULT })
      } else {
        setState(input.clip.id, { status: "suggested", result: RESULT })
      }
      return RESULT
    },
    markApplied: (clipId: string) => {
      const state = states.get(clipId)
      if (state?.status === "suggested") setState(clipId, { status: "applied", result: state.result })
    },
    getState: (clipId: string): BpmSuggestionState => states.get(clipId) ?? { status: "idle" },
    subscribe: (listener: Listener) => { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

export type BpmDetectionService = ReturnType<typeof createBpmDetectionService>
