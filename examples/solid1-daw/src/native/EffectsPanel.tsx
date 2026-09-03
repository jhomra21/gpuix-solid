import { createDefaultCompressorParams, type CompressorParams, type EqBandParams, type EqBandType } from "@daw-browser/shared"
import { For, createSignal, type JSX } from "solid-js"
import Compressor from "~/components/effects/Compressor"
import EqFilterTypeSelect from "~/components/effects/eq-filter-type-select"
import { DeviceCollapseProvider, safeDeviceContentId } from "~/components/timeline/create-effects-panel-device-collapse"
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

function DeviceHeader(props: { title: string; typeLabel: string; enabled: boolean; resetTestId: string; onReset: () => void; onToggle: () => void }): JSX.Element {
  return (
    <div style={{ height: 30, minHeight: 30, display: "flex", alignItems: "stretch", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface }}>
      <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 8, paddingLeft: 9 }}>
        <text style={{ ...textXs, color: dawTheme.foreground, fontWeight: 700 }}>{props.title}</text>
        <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.typeLabel}</text>
      </div>
      <div testId={props.resetTestId} onClick={props.onReset} style={{ display: "flex", flexDirection: "row", height: 30, minHeight: 30, width: 42, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, cursor: "pointer" }}>
        <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Reset</text>
      </div>
      <div onClick={props.onToggle} style={{ display: "flex", flexDirection: "row", height: 30, minHeight: 30, width: 38, alignItems: "center", justifyContent: "center", backgroundColor: props.enabled ? "#0e4a5d" : dawTheme.timelineSurface, borderLeftWidth: 1, borderColor: dawTheme.border, cursor: "pointer" }}>
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
const COMPRESSOR_DEFAULTS = createDefaultCompressorParams()

const EQ_INITIAL_FREQUENCIES = [40, 120, 300, 650, 1200, 3000, 7800, 16000]
const EQ_INITIAL_Q = [0.7, 1, 1, 1, 1, 1, 1, 0.7]
const EQ_DEFAULT_FREQUENCIES = [40, 100, 200, 500, 1000, 2500, 6000, 12000]
const EQ_DEFAULT_Q = [1, 1, 1, 1, 1, 1, 1, 1]
const EQ_DEFAULT_TYPES: EqBandType[] = ["lowshelf", "peaking", "peaking", "peaking", "peaking", "peaking", "peaking", "highshelf"]

const EffectsPanel = (props: EffectsPanelProps): JSX.Element => {
  const [compressorAutoRelease, setCompressorAutoRelease] = createSignal(COMPRESSOR_DEFAULTS.autoRelease)
  const [compressorKnee, setCompressorKnee] = createSignal(COMPRESSOR_DEFAULTS.kneeDb)
  const [compressorLookahead, setCompressorLookahead] = createSignal(COMPRESSOR_DEFAULTS.lookaheadMs)
  const [compressorMakeup, setCompressorMakeup] = createSignal(COMPRESSOR_DEFAULTS.makeupDb)
  const [compressorDetector, setCompressorDetector] = createSignal(COMPRESSOR_DEFAULTS.detectorMode)
  const [compressorDynamics, setCompressorDynamics] = createSignal(COMPRESSOR_DEFAULTS.dynamicsMode)
  const [compressorEnvelope, setCompressorEnvelope] = createSignal(COMPRESSOR_DEFAULTS.envelopeCurve)
  const [compressorCollapsed, setCompressorCollapsed] = createSignal(false)

  const [eqSelectedBand, setEqSelectedBand] = createSignal(4)
  const [eqFrequencies, setEqFrequencies] = createSignal([...EQ_INITIAL_FREQUENCIES])
  const [eqQ, setEqQ] = createSignal([...EQ_INITIAL_Q])
  const [eqOtherGains, setEqOtherGains] = createSignal<Record<number, number>>({})
  const [eqBandEnabled, setEqBandEnabled] = createSignal(Array.from({ length: 8 }, () => true))
  const [eqBandTypes, setEqBandTypes] = createSignal<EqBandType[]>([...EQ_DEFAULT_TYPES])
  const [eqChannelMode, setEqChannelMode] = createSignal<"Mono" | "Stereo">("Stereo")

  const eqGain = (index: number): number => {
    if (index === 1) return props.eqLowGain
    if (index === 4) return props.eqMidGain
    if (index === 6) return props.eqHighGain
    return eqOtherGains()[index] ?? 0
  }

  const eqBand = (index: number): EqBandParams => ({
    id: `b${index + 1}`,
    frequency: eqFrequencies()[index] ?? 1000,
    gainDb: eqGain(index),
    q: eqQ()[index] ?? 1,
    enabled: eqBandEnabled()[index] ?? true,
    type: eqBandTypes()[index] ?? "peaking",
  })

  const setEqGain = (index: number, value: number): void => {
    const next = clamp(value, -12, 12)
    if (index === 1) props.onEqLowGain(next)
    else if (index === 4) props.onEqMidGain(next)
    else if (index === 6) props.onEqHighGain(next)
    else setEqOtherGains((current) => ({ ...current, [index]: next }))
  }

  const setEqBandType = (index: number, type: EqBandType): void => {
    setEqBandTypes((current) => current.map((bandType, entry) => entry === index ? type : bandType))
  }

  const setSelectedFrequency = (value: number): void => {
    const index = eqSelectedBand()
    setEqFrequencies((current) => current.map((frequency, entry) => entry === index ? clamp(value, 20, 20000) : frequency))
  }

  const setSelectedQ = (value: number): void => {
    const index = eqSelectedBand()
    setEqQ((current) => current.map((q, entry) => entry === index ? clamp(value, 0.1, 18) : q))
  }

  const compressorParams = (): CompressorParams => ({
    enabled: props.compressorEnabled,
    thresholdDb: props.compressorThreshold,
    ratio: props.compressorRatio,
    attackMs: props.compressorAttack,
    releaseMs: props.compressorRelease,
    autoRelease: compressorAutoRelease(),
    makeupDb: compressorMakeup(),
    outputDb: COMPRESSOR_DEFAULTS.outputDb,
    dryWet: props.compressorWet,
    kneeDb: compressorKnee(),
    lookaheadMs: compressorLookahead(),
    detectorMode: compressorDetector(),
    dynamicsMode: compressorDynamics(),
    envelopeCurve: compressorEnvelope(),
    sidechain: COMPRESSOR_DEFAULTS.sidechain,
  })

  const updateCompressor = (updates: Partial<CompressorParams>): void => {
    if (updates.enabled !== undefined && updates.enabled !== props.compressorEnabled) props.onToggleCompressor()
    if (updates.thresholdDb !== undefined) props.onThresholdChange(updates.thresholdDb)
    if (updates.ratio !== undefined) props.onRatioChange(updates.ratio)
    if (updates.attackMs !== undefined) props.onAttackChange(updates.attackMs)
    if (updates.releaseMs !== undefined) props.onReleaseChange(updates.releaseMs)
    if (updates.autoRelease !== undefined) setCompressorAutoRelease(updates.autoRelease)
    if (updates.makeupDb !== undefined) setCompressorMakeup(updates.makeupDb)
    if (updates.dryWet !== undefined) props.onWetChange(updates.dryWet)
    if (updates.kneeDb !== undefined) setCompressorKnee(updates.kneeDb)
    if (updates.lookaheadMs !== undefined) setCompressorLookahead(updates.lookaheadMs)
    if (updates.detectorMode !== undefined) setCompressorDetector(updates.detectorMode)
    if (updates.dynamicsMode !== undefined) setCompressorDynamics(updates.dynamicsMode)
    if (updates.envelopeCurve !== undefined) setCompressorEnvelope(updates.envelopeCurve)
  }

  const resetCompressor = (): void => {
    if (!props.compressorEnabled) props.onToggleCompressor()
    props.onThresholdChange(COMPRESSOR_DEFAULTS.thresholdDb)
    props.onRatioChange(COMPRESSOR_DEFAULTS.ratio)
    props.onAttackChange(COMPRESSOR_DEFAULTS.attackMs)
    props.onReleaseChange(COMPRESSOR_DEFAULTS.releaseMs)
    props.onWetChange(COMPRESSOR_DEFAULTS.dryWet)
    setCompressorAutoRelease(COMPRESSOR_DEFAULTS.autoRelease)
    setCompressorKnee(COMPRESSOR_DEFAULTS.kneeDb)
    setCompressorLookahead(COMPRESSOR_DEFAULTS.lookaheadMs)
    setCompressorMakeup(COMPRESSOR_DEFAULTS.makeupDb)
    setCompressorDetector(COMPRESSOR_DEFAULTS.detectorMode)
    setCompressorDynamics(COMPRESSOR_DEFAULTS.dynamicsMode)
    setCompressorEnvelope(COMPRESSOR_DEFAULTS.envelopeCurve)
  }

  const resetEq = (): void => {
    if (!props.eqEnabled) props.onToggleEq()
    props.onEqLowGain(0)
    props.onEqMidGain(0)
    props.onEqHighGain(0)
    setEqOtherGains({})
    setEqFrequencies([...EQ_DEFAULT_FREQUENCIES])
    setEqQ([...EQ_DEFAULT_Q])
    setEqBandEnabled(Array.from({ length: 8 }, () => true))
    setEqBandTypes([...EQ_DEFAULT_TYPES])
    setEqChannelMode("Stereo")
  }

  const selectedFrequency = () => eqFrequencies()[eqSelectedBand()] ?? 1000
  const selectedQ = () => eqQ()[eqSelectedBand()] ?? 1
  const selectedGain = () => eqGain(eqSelectedBand())

  return (
    <div testId="effects-panel" style={{ height: "100%", minHeight: 0, overflowX: "auto", overflowY: "hidden", padding: 4, backgroundColor: dawTheme.appSurface }}>
      <div style={{ height: "100%", display: "flex", alignItems: "stretch", gap: 12, minWidth: 1290 }}>
        <DeviceCollapseProvider
          collapsed={compressorCollapsed}
          toggle={() => setCompressorCollapsed((collapsed) => !collapsed)}
          contentId={() => safeDeviceContentId("audio-effect:fixture-compressor")}
          canWrite={() => true}
        >
          <div testId="compressor-device" style={{ height: "100%", display: "flex", flexShrink: 0 }}>
            <Compressor
              params={compressorParams()}
              onChange={updateCompressor}
              onToggleEnabled={(enabled) => {
                if (enabled !== props.compressorEnabled) props.onToggleCompressor()
              }}
              onReset={resetCompressor}
            />
          </div>
        </DeviceCollapseProvider>

        <div testId="eq-device" style={{ width: 704, minWidth: 704, height: "100%", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface, opacity: props.eqEnabled ? 1 : 0.7 }}>
          <DeviceHeader title="EQ Eight" typeLabel={eqChannelMode()} enabled={props.eqEnabled} resetTestId="eq-reset" onReset={resetEq} onToggle={props.onToggleEq} />
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
                <For each={eqFrequencies()}>
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
                {(_frequency, index) => (
                  <div testId={`eq-band-${index() + 1}`} onClick={() => setEqSelectedBand(index())} style={{ flexGrow: 1, minWidth: 0, height: 52, padding: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRightWidth: index() === 7 ? 0 : 1, borderColor: dawTheme.border, cursor: "pointer" }}>
                    <div testId={`eq-filter-type-${index() + 1}`} style={{ width: "100%", height: 16, minHeight: 16 }}>
                      <EqFilterTypeSelect
                        band={eqBand(index())}
                        enabled={props.eqEnabled}
                        selected={eqSelectedBand() === index()}
                        onSelectBand={() => setEqSelectedBand(index())}
                        onTypeChange={(type) => setEqBandType(index(), type)}
                      />
                    </div>
                    <div style={{ height: 20, minHeight: 20, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div testId={`eq-band-${index() + 1}-toggle`} onClick={() => setEqBandEnabled((current) => current.map((enabled, entry) => entry === index() ? !enabled : enabled))} style={{ width: 14, height: 14, backgroundColor: eqBandEnabled()[index()] ? "#22d3ee" : dawTheme.appSurface, borderWidth: 1, borderColor: dawTheme.border }} />
                      <text style={{ ...text2xs, width: 12, textAlign: "center", color: eqSelectedBand() === index() ? dawTheme.amber : dawTheme.mutedForeground, fontWeight: 700 }}>{String(index() + 1)}</text>
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