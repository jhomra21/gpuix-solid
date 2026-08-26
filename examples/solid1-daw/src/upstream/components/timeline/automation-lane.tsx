import type { Component } from "solid-js"
import type { AutomationEnvelope } from "@daw-browser/shared"

type AutomationLaneProps = {
  projectId: string
  target: { kind: "track"; trackId: string; effectInstanceId?: string }
  parameterId: string
  envelope: AutomationEnvelope | undefined
  durationSec: number
  pixelsPerSecond: number
  heightPx: number
  onPreview: (envelope: AutomationEnvelope | undefined) => void
  onCommit: (envelope: AutomationEnvelope | undefined, targetKey: string) => void
  onCancelPreview: (targetKey: string) => void
}

const AutomationLane: Component<AutomationLaneProps> = () => null

export default AutomationLane
