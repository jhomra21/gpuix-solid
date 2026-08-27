import { For, createSignal, type JSX } from "solid-js"
import { dawTheme, text2xs, text3xs, textXs } from "./theme"

interface KnobProps {
  testId: string
  label: string
  valueLabel: string
  active?: boolean
  onDecrease: () => void
  onIncrease: () => void
}

function Knob(props: KnobProps): JSX.Element {
  return (
    <div style={{ width: 72, minWidth: 72, alignItems: "center", gap: 3 }}>
      <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.label}</text>
      <div style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: props.active === false ? dawTheme.border : "#71717a", backgroundColor: dawTheme.timelineBackground, position: "relative" }}>
        <div style={{ position: "absolute", top: 4, left: 18, width: 2, height: 12, backgroundColor: props.active === false ? dawTheme.mutedForeground : dawTheme.foreground }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div testId={`${props.testId}-minus`} onClick={props.onDecrease} style={{ display: "flex", flexDirection: "row", width: 18, height: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>−</text></div>
        <text testId={`${props.testId}-value`} style={{ ...text3xs, minWidth: 32, color: dawTheme.foreground, fontFamily: "monospace", textAlign: "center" }}>{props.valueLabel}</text>
        <div testId={`${props.testId}-plus`} onClick={props.onIncrease} style={{ display: "flex", flexDirection: "row", width: 18, height: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>+</text></div>
      </div>
    </div>
  )
}

function DeviceHeader(props: { title: string; typeLabel: string; enabled: boolean; onToggle: () => void }): JSX.Element {
  return (
    <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "stretch", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface }}>
      <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 8, paddingLeft: 9 }}>
        <text style={{ ...textXs, color: dawTheme.foreground, fontWeight: 700 }}>{props.title}</text>
        <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.typeLabel}</text>
      </div>
      <div style={{ display: "flex", flexDirection: "row", height: 30, minHeight: 30, width: 42, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}>
        <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Reset</text>
      </div>
      <div onClick={props.onToggle} style={{ display: "flex", flexDirection: "row", height: 30, minHeight: 30, width: 38, alignItems: "center", justifyContent: "center", backgroundColor: props.enabled ? "#0e4a5d" : dawTheme.timelineSurface, borderLeftWidth: 1, borderColor: dawTheme.border, cursor: "pointer" }}>
        <text style={{ ...text2xs, color: props.enabled ? "#67e8f9" : dawTheme.mutedForeground }}>{props.enabled ? "On" : "Off"}</text>
      </div>
    </div>
  )
}

function ToggleButton(props: { label: string; active: boolean; disabled?: boolean; onClick: () => void }): JSX.Element {
  return (
    <div
      onClick={() => { if (!props.disabled) props.onClick() }}
      style={{
        display: "flex",
        flexDirection: "row",
        minWidth: 34,
        height: 22,
        paddingLeft: 5,
        paddingRight: 5,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: dawTheme.border,
        backgroundColor: props.active ? dawTheme.amber : dawTheme.timelineSurfaceMuted,
        opacity: props.disabled ? 0.5 : 1,
        cursor: props.disabled ? "default" : "pointer",
      }}
    >
      <text style={{ ...text3xs, color: props.active ? "#111111" : dawTheme.mutedForeground }}>{props.label}</text>
    </div>
  )
}

function MiniStatus(props: { label: string; value: string; tone?: "cyan" | "yellow" }): JSX.Element {
  return (
    <div style={{ flexGrow: 1, minWidth: 0, padding: 5, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: "#09090bcc" }}>
      <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.label}</text>
      <text style={{ ...text2xs, color: props.tone === "cyan" ? "#67e8f9" : props.tone === "yellow" ? "#fde047" : dawTheme.foreground, fontFamily: "monospace" }}>{props.value}</text>
    </div>
  )
}

export interface EffectsPanelProps {
  compressorEnabled: boolean
  onToggleCompressor: () => void
  compressorRatio: number
  onRatioChange: (value: number) => void
  compressorAttack: number
  onAttackChange: (value: number) => void
  compressorRelease: number
  onReleaseChange: (value: number) => void
  compressorThreshold: number
  onThresholdChange: (value: number) => void
  compressorWet: number
  onWetChange: (value: number) => void
  eqEnabled: boolean
  onToggleEq: () => void
  eqLowGain: number
  onEqLowGain: (value: number) => void
  eqMidGain: number
  onEqMidGain: (value: number) => void
  eqHighGain: number
  onEqHighGain: (value: number) => void
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))
const signedDb = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`

const EQ_INITIAL_FREQUENCIES = [40, 120, 300, 650, 1200, 3000, 7800, 16000]
const EQ_INITIAL_Q = [0.7, 1, 1, 1, 1, 1, 1, 0.7]

const EffectsPanel = (props: EffectsPanelProps): JSX.Element => {
  const [compressorAutoRelease, setCompressorAutoRelease] = createSignal(false)
  const [compressorKnee, setCompressorKnee] = createSignal(6)
  const [compressorLookahead, setCompressorLookahead] = createSignal(0)
  const [compressorMakeup, setCompressorMakeup] = createSignal(0)
  const [compressorDetector, setCompressorDetector] = createSignal<"PEAK" | "RMS">("PEAK")
  const [compressorDynamics, setCompressorDynamics] = createSignal<"Compress" | "Expand">("Compress")
  const [compressorEnvelope, setCompressorEnvelope] = createSignal<"Log" | "Linear">("Log")
  const [compressorView, setCompressorView] = createSignal<"Transfer" | "GR" | "Output">("Transfer")

  const [eqSelectedBand, setEqSelectedBand] = createSignal(4)
  const [eqFrequencies, setEqFrequencies] = createSignal([...EQ_INITIAL_FREQUENCIES])
  const [eqQ, setEqQ] = createSignal([...EQ_INITIAL_Q])
  const [eqOtherGains, setEqOtherGains] = createSignal<Record<number, number>>({})
  const [eqBandEnabled, setEqBandEnabled] = createSignal(Array.from({ length: 8 }, () => true))
  const [eqChannelMode, setEqChannelMode] = createSignal<"Mono" | "Stereo">("Stereo")

  const eqGain = (index: number): number => {
    if (index === 1) return props.eqLowGain
    if (index === 4) return props.eqMidGain
    if (index === 6) return props.eqHighGain
    return eqOtherGains()[index] ?? 0
  }

  const setEqGain = (index: number, value: number): void => {
    const next = clamp(value, -12, 12)
    if (index === 1) props.onEqLowGain(next)
    else if (index === 4) props.onEqMidGain(next)
    else if (index === 6) props.onEqHighGain(next)
    else setEqOtherGains((current) => ({ ...current, [index]: next }))
  }

  const setSelectedFrequency = (value: number): void => {
    const index = eqSelectedBand()
    setEqFrequencies((current) => current.map((frequency, entry) => entry === index ? clamp(value, 20, 20000) : frequency))
  }

  const setSelectedQ = (value: number): void => {
    const index = eqSelectedBand()
    setEqQ((current) => current.map((q, entry) => entry === index ? clamp(value, 0.1, 18) : q))
  }

  const selectedFrequency = () => eqFrequencies()[eqSelectedBand()] ?? 1000
  const selectedQ = () => eqQ()[eqSelectedBand()] ?? 1
  const selectedGain = () => eqGain(eqSelectedBand())

  return (
    <div testId="effects-panel" style={{ height: "100%", minHeight: 0, overflowX: "auto", overflowY: "hidden", padding: 4, backgroundColor: dawTheme.appSurface }}>
      <div style={{ height: "100%", display: "flex", alignItems: "stretch", gap: 12, minWidth: 1290 }}>
        <div testId="compressor-device" style={{ width: 560, minWidth: 560, height: "100%", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, opacity: props.compressorEnabled ? 1 : 0.7 }}>
          <DeviceHeader title="Compressor" typeLabel="Audio" enabled={props.compressorEnabled} onToggle={props.onToggleCompressor} />
          <div style={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 8, padding: 10 }}>
            <div style={{ width: 84, minWidth: 84, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <Knob testId="compressor-ratio" label="Ratio" valueLabel={`${props.compressorRatio.toFixed(props.compressorRatio < 10 ? 1 : 0)}:1`} active={props.compressorEnabled} onDecrease={() => props.onRatioChange(clamp(props.compressorRatio - 0.5, 1, 20))} onIncrease={() => props.onRatioChange(clamp(props.compressorRatio + 0.5, 1, 20))} />
              <Knob testId="compressor-attack" label="Attack" valueLabel={`${props.compressorAttack.toFixed(props.compressorAttack < 10 ? 1 : 0)} ms`} active={props.compressorEnabled} onDecrease={() => props.onAttackChange(clamp(props.compressorAttack - 1, 0, 100))} onIncrease={() => props.onAttackChange(clamp(props.compressorAttack + 1, 0, 100))} />
              <Knob testId="compressor-release" label="Release" valueLabel={`${Math.round(props.compressorRelease)} ms`} active={props.compressorEnabled && !compressorAutoRelease()} onDecrease={() => props.onReleaseChange(clamp(props.compressorRelease - 10, 20, 800))} onIncrease={() => props.onReleaseChange(clamp(props.compressorRelease + 10, 20, 800))} />
              <ToggleButton label="Auto" active={compressorAutoRelease()} disabled={!props.compressorEnabled} onClick={() => setCompressorAutoRelease((active) => !active)} />
            </div>

            <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 38, minHeight: 38, display: "flex", gap: 4 }}>
                <MiniStatus label="THRESH" value={`${props.compressorThreshold.toFixed(1)} dB`} tone="cyan" />
                <MiniStatus label="GR" value="-3.8 dB" tone="yellow" />
                <MiniStatus label="OUTPUT" value="-7.2 dB" />
                <MiniStatus label="OUT" value="0.0 dB" />
              </div>

              <div style={{ flexGrow: 1, minHeight: 105, position: "relative", overflow: "hidden", backgroundColor: dawTheme.deviceGraphBackground, borderWidth: 1, borderColor: dawTheme.border }}>
                <For each={[1,2,3,4,5,6,7,8]}>{(index) => <div style={{ position: "absolute", left: index * 40, top: 0, width: 1, height: 150, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
                <For each={[1,2,3,4]}>{(index) => <div style={{ position: "absolute", top: index * 30, left: 0, width: 320, height: 1, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
                <div style={{ position: "absolute", left: 18, top: 116, width: 282, height: 2, backgroundColor: dawTheme.deviceGraphAccent }} />
                <div style={{ position: "absolute", left: 116, top: 18, width: 1, height: 120, backgroundColor: dawTheme.deviceGraphAccent }} />
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ display: "flex", gap: 3, paddingTop: 8 }}>
                  <For each={["Transfer", "GR", "Output"] as const}>{(mode) => <ToggleButton label={mode} active={compressorView() === mode} disabled={!props.compressorEnabled} onClick={() => setCompressorView(mode)} />}</For>
                </div>
                <div style={{ flexGrow: 1, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                  <Knob testId="compressor-threshold" label="Thresh" valueLabel={`${props.compressorThreshold.toFixed(1)} dB`} active={props.compressorEnabled} onDecrease={() => props.onThresholdChange(clamp(props.compressorThreshold - 1, -60, 0))} onIncrease={() => props.onThresholdChange(clamp(props.compressorThreshold + 1, -60, 0))} />
                  <Knob testId="compressor-knee" label="Knee" valueLabel={`${compressorKnee().toFixed(1)} dB`} active={props.compressorEnabled} onDecrease={() => setCompressorKnee((value) => clamp(value - 1, 0, 40))} onIncrease={() => setCompressorKnee((value) => clamp(value + 1, 0, 40))} />
                  <Knob testId="compressor-look" label="Look" valueLabel={`${compressorLookahead().toFixed(1)} ms`} active={props.compressorEnabled} onDecrease={() => setCompressorLookahead((value) => clamp(value - 0.5, 0, 20))} onIncrease={() => setCompressorLookahead((value) => clamp(value + 0.5, 0, 20))} />
                </div>
              </div>
            </div>

            <div style={{ width: 96, minWidth: 96, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Knob testId="compressor-makeup" label="Makeup" valueLabel={`${compressorMakeup().toFixed(1)} dB`} active={props.compressorEnabled} onDecrease={() => setCompressorMakeup((value) => clamp(value - 1, -24, 24))} onIncrease={() => setCompressorMakeup((value) => clamp(value + 1, -24, 24))} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                <ToggleButton label="PEAK" active={compressorDetector() === "PEAK"} disabled={!props.compressorEnabled} onClick={() => setCompressorDetector("PEAK")} />
                <ToggleButton label="RMS" active={compressorDetector() === "RMS"} disabled={!props.compressorEnabled} onClick={() => setCompressorDetector("RMS")} />
                <ToggleButton label="Compress" active={compressorDynamics() === "Compress"} disabled={!props.compressorEnabled} onClick={() => setCompressorDynamics("Compress")} />
                <ToggleButton label="Expand" active={compressorDynamics() === "Expand"} disabled={!props.compressorEnabled} onClick={() => setCompressorDynamics("Expand")} />
                <ToggleButton label="Log" active={compressorEnvelope() === "Log"} disabled={!props.compressorEnabled} onClick={() => setCompressorEnvelope("Log")} />
                <ToggleButton label="Linear" active={compressorEnvelope() === "Linear"} disabled={!props.compressorEnabled} onClick={() => setCompressorEnvelope("Linear")} />
              </div>
              <Knob testId="compressor-wet" label="Dry/Wet" valueLabel={`${Math.round(props.compressorWet * 100)}%`} active={props.compressorEnabled} onDecrease={() => props.onWetChange(clamp(props.compressorWet - 0.1, 0, 1))} onIncrease={() => props.onWetChange(clamp(props.compressorWet + 0.1, 0, 1))} />
            </div>
          </div>
        </div>

        <div testId="eq-device" style={{ width: 704, minWidth: 704, height: "100%", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, opacity: props.eqEnabled ? 1 : 0.7 }}>
          <DeviceHeader title="EQ Eight" typeLabel={eqChannelMode()} enabled={props.eqEnabled} onToggle={props.onToggleEq} />
          <div style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
              <div style={{ width: 72, minWidth: 72, display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center", paddingTop: 4, paddingBottom: 4, borderRightWidth: 1, borderColor: dawTheme.border, backgroundColor: "#09090b4d" }}>
                <Knob testId="eq-selected-frequency" label="Freq" valueLabel={selectedFrequency() >= 1000 ? `${(selectedFrequency() / 1000).toFixed(2)} kHz` : `${Math.round(selectedFrequency())} Hz`} active={props.eqEnabled} onDecrease={() => setSelectedFrequency(selectedFrequency() / 1.15)} onIncrease={() => setSelectedFrequency(selectedFrequency() * 1.15)} />
                <Knob testId="eq-selected-gain" label="Gain" valueLabel={signedDb(selectedGain())} active={props.eqEnabled} onDecrease={() => setEqGain(eqSelectedBand(), selectedGain() - 1)} onIncrease={() => setEqGain(eqSelectedBand(), selectedGain() + 1)} />
                <Knob testId="eq-selected-q" label="Q" valueLabel={selectedQ().toFixed(2)} active={props.eqEnabled} onDecrease={() => setSelectedQ(selectedQ() - 0.1)} onIncrease={() => setSelectedQ(selectedQ() + 0.1)} />
              </div>

              <div style={{ flexGrow: 1, minWidth: 0, position: "relative", overflow: "hidden", backgroundColor: dawTheme.deviceGraphBackground }}>
                <For each={[1,2,3,4,5,6,7,8,9]}>{(index) => <div style={{ position: "absolute", left: index * 54, top: 0, width: 1, height: 230, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
                <For each={[1,2,3,4,5]}>{(index) => <div style={{ position: "absolute", top: index * 38, left: 0, width: 540, height: 1, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
                <div style={{ position: "absolute", left: 0, top: 114, width: 540, height: 2, backgroundColor: dawTheme.deviceGraphAccent }} />
                <For each={EQ_INITIAL_FREQUENCIES}>
                  {(frequency, index) => {
                    const gain = () => eqGain(index())
                    const x = () => 12 + Math.log10(frequency / 20) / Math.log10(20000 / 20) * 490
                    const y = () => 114 - gain() * 4
                    return (
                      <div style={{ position: "absolute", left: x(), top: y(), width: eqSelectedBand() === index() ? 14 : 12, height: eqSelectedBand() === index() ? 14 : 12, borderRadius: 7, backgroundColor: eqSelectedBand() === index() ? dawTheme.clipSelected : dawTheme.deviceGraphAccent, borderWidth: 2, borderColor: dawTheme.deviceGraphBackground }} />
                    )
                  }}
                </For>
              </div>

              <div style={{ width: 72, minWidth: 72, padding: 7, borderLeftWidth: 1, borderColor: dawTheme.border, backgroundColor: "#09090b66" }}>
                <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Mode</text>
                <div onClick={() => setEqChannelMode((mode) => mode === "Stereo" ? "Mono" : "Stereo")} style={{ height: 22, marginTop: 4, marginBottom: 12, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 5, paddingRight: 5, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface, cursor: "pointer" }}>
                  <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{eqChannelMode()}</text>
                  <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>⌄</text>
                </div>
                <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Edit</text>
                <div style={{ height: 20, marginTop: 4, paddingLeft: 5, display: "flex", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>A</text></div>
              </div>
            </div>

            <div style={{ height: 52, minHeight: 52, display: "flex", borderTopWidth: 1, borderColor: dawTheme.border, backgroundColor: "#09090b" }}>
              <For each={EQ_INITIAL_FREQUENCIES}>
                {(frequency, index) => (
                  <div testId={`eq-band-${index() + 1}`} onClick={() => setEqSelectedBand(index())} style={{ flexGrow: 1, minWidth: 0, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRightWidth: index() === 7 ? 0 : 1, borderColor: dawTheme.border, cursor: "pointer" }}>
                    <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{index() === 0 ? "HP" : index() === 7 ? "LP" : "Bell"}</text>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <div onClick={() => setEqBandEnabled((current) => current.map((enabled, entry) => entry === index() ? !enabled : enabled))} style={{ width: 12, height: 12, backgroundColor: eqBandEnabled()[index()] ? "#22d3ee" : dawTheme.appSurface, borderWidth: 1, borderColor: dawTheme.border }} />
                      <text style={{ ...text2xs, color: eqSelectedBand() === index() ? dawTheme.amber : dawTheme.mutedForeground, fontWeight: 700 }}>{String(index() + 1)}</text>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EffectsPanel
