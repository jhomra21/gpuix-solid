import { For, type JSX } from "solid-js"
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
        <div testId={`${props.testId}-minus`} onClick={props.onDecrease} style={{ width: 18, height: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>−</text></div>
        <text testId={`${props.testId}-value`} style={{ ...text3xs, minWidth: 32, color: dawTheme.foreground, fontFamily: "monospace", textAlign: "center" }}>{props.valueLabel}</text>
        <div testId={`${props.testId}-plus`} onClick={props.onIncrease} style={{ width: 18, height: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>+</text></div>
      </div>
    </div>
  )
}

function DeviceHeader(props: { title: string; enabled: boolean; onToggle: () => void }): JSX.Element {
  return (
    <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface }}>
      <div style={{ flexGrow: 1, display: "flex", alignItems: "baseline", gap: 8, paddingLeft: 9 }}>
        <text style={{ ...textXs, color: dawTheme.foreground, fontWeight: 700 }}>{props.title}</text>
        <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Audio</text>
      </div>
      <div onClick={props.onToggle} style={{ height: 30, minHeight: 30, width: 38, alignItems: "center", justifyContent: "center", backgroundColor: props.enabled ? "#0e4a5d" : dawTheme.timelineSurface, borderWidth: 1, borderColor: dawTheme.border, cursor: "pointer" }}>
        <text style={{ ...text2xs, color: props.enabled ? "#67e8f9" : dawTheme.mutedForeground }}>{props.enabled ? "On" : "Off"}</text>
      </div>
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

const EffectsPanel = (props: EffectsPanelProps): JSX.Element => (
  <div testId="effects-panel" style={{ height: "100%", minHeight: 0, overflowX: "auto", overflowY: "hidden", padding: 4, backgroundColor: dawTheme.appSurface }}>
    <div style={{ height: "100%", display: "flex", alignItems: "stretch", gap: 12, minWidth: 1100 }}>
      <div testId="compressor-device" style={{ width: 560, minWidth: 560, height: "100%", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, opacity: props.compressorEnabled ? 1 : 0.7 }}>
        <DeviceHeader title="Compressor" enabled={props.compressorEnabled} onToggle={props.onToggleCompressor} />
        <div style={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 8, padding: 10 }}>
          <div style={{ width: 84, minWidth: 84, gap: 8, alignItems: "center" }}>
            <Knob testId="compressor-ratio" label="Ratio" valueLabel={`${props.compressorRatio.toFixed(props.compressorRatio < 10 ? 1 : 0)}:1`} active={props.compressorEnabled} onDecrease={() => props.onRatioChange(clamp(props.compressorRatio - 0.5, 1, 20))} onIncrease={() => props.onRatioChange(clamp(props.compressorRatio + 0.5, 1, 20))} />
            <Knob testId="compressor-attack" label="Attack" valueLabel={`${props.compressorAttack.toFixed(props.compressorAttack < 10 ? 1 : 0)} ms`} active={props.compressorEnabled} onDecrease={() => props.onAttackChange(clamp(props.compressorAttack - 1, 0, 100))} onIncrease={() => props.onAttackChange(clamp(props.compressorAttack + 1, 0, 100))} />
            <Knob testId="compressor-release" label="Release" valueLabel={`${Math.round(props.compressorRelease)} ms`} active={props.compressorEnabled} onDecrease={() => props.onReleaseChange(clamp(props.compressorRelease - 10, 20, 800))} onIncrease={() => props.onReleaseChange(clamp(props.compressorRelease + 10, 20, 800))} />
          </div>

          <div style={{ flexGrow: 1, minWidth: 0, gap: 7 }}>
            <div style={{ height: 38, minHeight: 38, display: "flex", gap: 4 }}>
              <For each={[
                ["THRESH", `${props.compressorThreshold.toFixed(1)} dB`, "#67e8f9"],
                ["GR", "-3.8 dB", "#fde047"],
                ["OUTPUT", "-7.2 dB", dawTheme.foreground],
                ["OUT", "0.0 dB", dawTheme.foreground],
              ] as const}>
                {(item) => (
                  <div style={{ flexGrow: 1, minWidth: 0, padding: 5, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: "#09090bcc" }}>
                    <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{item[0]}</text>
                    <text style={{ ...text2xs, color: item[2], fontFamily: "monospace" }}>{item[1]}</text>
                  </div>
                )}
              </For>
            </div>

            <div style={{ flexGrow: 1, minHeight: 120, position: "relative", overflow: "hidden", backgroundColor: dawTheme.deviceGraphBackground, borderWidth: 1, borderColor: dawTheme.border }}>
              <For each={[1,2,3,4,5,6,7,8]}>{(index) => <div style={{ position: "absolute", left: index * 42, top: 0, width: 1, height: 160, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
              <For each={[1,2,3,4]}>{(index) => <div style={{ position: "absolute", top: index * 32, left: 0, width: 330, height: 1, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
              <div style={{ position: "absolute", left: 18, top: 116, width: 295, height: 2, backgroundColor: dawTheme.deviceGraphAccent }} />
              <div style={{ position: "absolute", left: 118, top: 18, width: 1, height: 120, backgroundColor: dawTheme.deviceGraphAccent }} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Knob testId="compressor-threshold" label="Thresh" valueLabel={`${props.compressorThreshold.toFixed(1)} dB`} active={props.compressorEnabled} onDecrease={() => props.onThresholdChange(clamp(props.compressorThreshold - 1, -60, 0))} onIncrease={() => props.onThresholdChange(clamp(props.compressorThreshold + 1, -60, 0))} />
              <Knob testId="compressor-wet" label="Dry/Wet" valueLabel={`${Math.round(props.compressorWet * 100)}%`} active={props.compressorEnabled} onDecrease={() => props.onWetChange(clamp(props.compressorWet - 0.1, 0, 1))} onIncrease={() => props.onWetChange(clamp(props.compressorWet + 0.1, 0, 1))} />
            </div>
          </div>

          <div style={{ width: 96, minWidth: 96, alignItems: "center", gap: 10 }}>
            <Knob testId="compressor-makeup" label="Makeup" valueLabel="0.0 dB" active={props.compressorEnabled} onDecrease={() => {}} onIncrease={() => {}} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
              <For each={["PEAK", "RMS", "Compress", "Log"]}>{(label) => <div style={{ height: 22, paddingLeft: 5, paddingRight: 5, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurfaceMuted }}><text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{label}</text></div>}</For>
            </div>
          </div>
        </div>
      </div>

      <div testId="eq-device" style={{ width: 520, minWidth: 520, height: "100%", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, opacity: props.eqEnabled ? 1 : 0.7 }}>
        <DeviceHeader title="EQ Eight" enabled={props.eqEnabled} onToggle={props.onToggleEq} />
        <div style={{ flexGrow: 1, minHeight: 0, padding: 10, gap: 8 }}>
          <div style={{ flexGrow: 1, minHeight: 180, position: "relative", overflow: "hidden", backgroundColor: dawTheme.deviceGraphBackground, borderWidth: 1, borderColor: dawTheme.border }}>
            <For each={[1,2,3,4,5,6,7,8,9]}>{(index) => <div style={{ position: "absolute", left: index * 50, top: 0, width: 1, height: 190, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
            <For each={[1,2,3,4,5]}>{(index) => <div style={{ position: "absolute", top: index * 31, left: 0, width: 500, height: 1, backgroundColor: dawTheme.deviceGraphGrid }} />}</For>
            <div style={{ position: "absolute", left: 0, top: 94, width: 500, height: 2, backgroundColor: dawTheme.deviceGraphAccent }} />
            <div style={{ position: "absolute", left: 80, top: 72 - props.eqLowGain * 3, width: 12, height: 12, borderRadius: 6, backgroundColor: dawTheme.green }} />
            <div style={{ position: "absolute", left: 245, top: 72 - props.eqMidGain * 3, width: 12, height: 12, borderRadius: 6, backgroundColor: dawTheme.blueSoft }} />
            <div style={{ position: "absolute", left: 405, top: 72 - props.eqHighGain * 3, width: 12, height: 12, borderRadius: 6, backgroundColor: "#c084fc" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", gap: 8 }}>
            <Knob testId="eq-low" label="Low 120Hz" valueLabel={signedDb(props.eqLowGain)} active={props.eqEnabled} onDecrease={() => props.onEqLowGain(clamp(props.eqLowGain - 1, -12, 12))} onIncrease={() => props.onEqLowGain(clamp(props.eqLowGain + 1, -12, 12))} />
            <Knob testId="eq-mid" label="Mid 1.2k" valueLabel={signedDb(props.eqMidGain)} active={props.eqEnabled} onDecrease={() => props.onEqMidGain(clamp(props.eqMidGain - 1, -12, 12))} onIncrease={() => props.onEqMidGain(clamp(props.eqMidGain + 1, -12, 12))} />
            <Knob testId="eq-high" label="High 7.8k" valueLabel={signedDb(props.eqHighGain)} active={props.eqEnabled} onDecrease={() => props.onEqHighGain(clamp(props.eqHighGain - 1, -12, 12))} onIncrease={() => props.onEqHighGain(clamp(props.eqHighGain + 1, -12, 12))} />
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default EffectsPanel
