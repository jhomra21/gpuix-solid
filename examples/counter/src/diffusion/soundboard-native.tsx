import { For, createSignal, type Element as SolidElement } from "solid-js"
import { C } from "./compat"

const SCALE_LABELS = ["0", "-3", "-6", "-12", "-24", "dB"] as const

function nextVolume(value: number): number {
  if (value <= -12) return 0
  return value - 3
}

function knobTop(volume: number): number {
  const clamped = Math.max(-60, Math.min(60, volume))
  return Math.round(((60 - clamped) / 120) * 142)
}

function Meter(props: { left: number; right: number }): SolidElement {
  return (
    <div style={{ width: 20, height: 150, display: "flex", flexDirection: "row", gap: 1 }}>
      <For each={[props.left, props.right]}>
        {(level) => (
          <div style={{ width: 9, height: 150, position: "relative", overflow: "hidden", backgroundColor: C.input }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(level * 150), backgroundColor: level > 0.85 ? C.meterRed : level > 0.6 ? C.meterYellow : C.meterGreen }} />
          </div>
        )}
      </For>
    </div>
  )
}

function Scale(): SolidElement {
  return (
    <div style={{ height: 150, display: "flex", flexDirection: "column", justifyContent: "space-between", marginLeft: 4 }}>
      <For each={SCALE_LABELS}>{(label) => <text style={{ color: C.mutedForeground, fontSize: 8, fontFamily: "monospace" }}>{label}</text>}</For>
    </div>
  )
}

function Fader(props: { testId: string; volume: number; onChange: (value: number) => void }): SolidElement {
  return (
    <div testId={props.testId} onClick={() => props.onChange(nextVolume(props.volume))} style={{ width: 12, height: 150, marginRight: 12, position: "relative", cursor: "pointer" }}>
      <For each={Array.from({ length: 21 }, (_, index) => index)}>
        {(index) => <div style={{ position: "absolute", right: 0, top: Math.round(index * 7.1), width: index % 4 === 0 ? 12 : 6, height: 1, backgroundColor: C.mutedForeground, pointerEvents: "none" }} />}
      </For>
      <div style={{ position: "absolute", left: -3, top: knobTop(props.volume), width: 18, height: 8, borderRadius: 2, backgroundColor: C.foreground, alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 12, height: 1, backgroundColor: C.background, pointerEvents: "none" }} />
      </div>
    </div>
  )
}

function Strip(props: {
  id: string
  name: string
  volume: number
  onVolumeChange: (value: number) => void
  levels: [number, number]
}): SolidElement {
  return (
    <div style={{ flexGrow: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "row", alignItems: "flex-end" }}>
        <Fader testId={`diffusion-soundboard-${props.id}-volume`} volume={props.volume} onChange={props.onVolumeChange} />
        <Meter left={props.levels[0]} right={props.levels[1]} />
        <Scale />
      </div>
      <div style={{ height: 24, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
        <text testId={`diffusion-soundboard-${props.id}-label`} style={{ color: C.mutedForeground, fontSize: props.id === "master" ? 16 : 10 }}>{props.name}</text>
      </div>
      <text testId={`diffusion-soundboard-${props.id}-volume-value`} style={{ color: C.mutedForeground, fontSize: 8 }}>{props.volume} dB</text>
    </div>
  )
}

export function Soundboard(): SolidElement {
  const [leftVolume, setLeftVolume] = createSignal(-3)
  const [rightVolume, setRightVolume] = createSignal(-6)
  const [masterVolume, setMasterVolume] = createSignal(0)

  return (
    <div testId="diffusion-soundboard" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 10, paddingLeft: 12, paddingRight: 12, paddingTop: 16, paddingBottom: 4, backgroundColor: C.background }}>
      <Strip id="left" name="voiceover.wav" volume={leftVolume()} onVolumeChange={setLeftVolume} levels={[0.55, 0.5]} />
      <Strip id="right" name="studio-intro.mp4" volume={rightVolume()} onVolumeChange={setRightVolume} levels={[0.72, 0.68]} />
      <Strip id="master" name="Master" volume={masterVolume()} onVolumeChange={setMasterVolume} levels={[0.62, 0.58]} />
    </div>
  )
}
