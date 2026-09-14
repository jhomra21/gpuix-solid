import {
  createDefaultCompressorParams,
  createDefaultEqParams,
  type CompressorParams,
  type EqBandParams,
  type EqChannelMode,
} from "@daw-browser/shared"
import { createSignal, type JSX } from "solid-js"
import Compressor from "~/components/effects/Compressor"
import Eq from "~/components/effects/Eq"
import { DeviceCollapseProvider, safeDeviceContentId } from "~/components/timeline/create-effects-panel-device-collapse"
import { dawTheme } from "./theme"

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

const COMPRESSOR_DEFAULTS = createDefaultCompressorParams()
const EQ_LOW_BAND_INDEX = 1
const EQ_MID_BAND_INDEX = 4
const EQ_HIGH_BAND_INDEX = 7

function updateBand(
  bands: readonly EqBandParams[],
  bandId: string,
  updates: Partial<EqBandParams>,
): EqBandParams[] {
  return bands.map((band) => band.id === bandId ? { ...band, ...updates } : band)
}

const EffectsPanel = (props: EffectsPanelProps): JSX.Element => {
  const [compressorAutoRelease, setCompressorAutoRelease] = createSignal(COMPRESSOR_DEFAULTS.autoRelease)
  const [compressorKnee, setCompressorKnee] = createSignal(COMPRESSOR_DEFAULTS.kneeDb)
  const [compressorLookahead, setCompressorLookahead] = createSignal(COMPRESSOR_DEFAULTS.lookaheadMs)
  const [compressorMakeup, setCompressorMakeup] = createSignal(COMPRESSOR_DEFAULTS.makeupDb)
  const [compressorDetector, setCompressorDetector] = createSignal(COMPRESSOR_DEFAULTS.detectorMode)
  const [compressorDynamics, setCompressorDynamics] = createSignal(COMPRESSOR_DEFAULTS.dynamicsMode)
  const [compressorEnvelope, setCompressorEnvelope] = createSignal(COMPRESSOR_DEFAULTS.envelopeCurve)
  const [compressorCollapsed, setCompressorCollapsed] = createSignal(false)
  const [eqCollapsed, setEqCollapsed] = createSignal(false)

  const initialEq = createDefaultEqParams()
  const [eqBands, setEqBands] = createSignal<EqBandParams[]>(initialEq.bands.map((band, index) => ({
    ...band,
    gainDb: index === EQ_LOW_BAND_INDEX
      ? props.eqLowGain
      : index === EQ_MID_BAND_INDEX
        ? props.eqMidGain
        : index === EQ_HIGH_BAND_INDEX
          ? props.eqHighGain
          : band.gainDb,
  })))
  const [eqPreviewBands, setEqPreviewBands] = createSignal<EqBandParams[]>()
  const [eqChannelMode, setEqChannelMode] = createSignal<EqChannelMode>(initialEq.channelMode)
  const displayedEqBands = () => eqPreviewBands() ?? eqBands()

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

  const syncFixtureEqGains = (bands: readonly EqBandParams[]): void => {
    const low = bands[EQ_LOW_BAND_INDEX]?.gainDb
    const mid = bands[EQ_MID_BAND_INDEX]?.gainDb
    const high = bands[EQ_HIGH_BAND_INDEX]?.gainDb
    if (low !== undefined && low !== props.eqLowGain) props.onEqLowGain(low)
    if (mid !== undefined && mid !== props.eqMidGain) props.onEqMidGain(mid)
    if (high !== undefined && high !== props.eqHighGain) props.onEqHighGain(high)
  }

  const updateEqBand = (bandId: string, updates: Partial<EqBandParams>): void => {
    setEqPreviewBands(undefined)
    setEqBands((current) => {
      const next = updateBand(current, bandId, updates)
      syncFixtureEqGains(next)
      return next
    })
  }

  // The copied EQ already distinguishes transient interaction from committed
  // model writes. Keep drag/knob frames local to the effect so a graph gesture
  // does not invalidate the entire DAW fixture on every pointer move.
  const beginEqInteraction = (): void => {
    setEqPreviewBands((current) => current ?? eqBands())
  }

  const previewEqBand = (bandId: string, updates: Partial<EqBandParams>): void => {
    setEqPreviewBands((current) => updateBand(current ?? eqBands(), bandId, updates))
  }

  const commitEqInteraction = (): void => {
    const preview = eqPreviewBands()
    if (!preview) return
    setEqBands(preview)
    syncFixtureEqGains(preview)
    setEqPreviewBands(undefined)
  }

  const cancelEqInteraction = (): void => {
    setEqPreviewBands(undefined)
  }

  const toggleEqBand = (bandId: string): void => {
    setEqPreviewBands(undefined)
    setEqBands((current) => current.map((band) => band.id === bandId ? { ...band, enabled: !band.enabled } : band))
  }

  const resetEq = (): void => {
    const defaults = createDefaultEqParams()
    if (!props.eqEnabled && defaults.enabled) props.onToggleEq()
    const bands = defaults.bands.map((band) => ({ ...band }))
    setEqPreviewBands(undefined)
    setEqBands(bands)
    setEqChannelMode(defaults.channelMode)
    syncFixtureEqGains(bands)
  }

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

        <DeviceCollapseProvider
          collapsed={eqCollapsed}
          toggle={() => setEqCollapsed((collapsed) => !collapsed)}
          contentId={() => safeDeviceContentId("audio-effect:fixture-eq")}
          canWrite={() => true}
        >
          <div testId="eq-device" style={{ height: "100%", display: "flex", flexShrink: 0 }}>
            <Eq
              bands={displayedEqBands()}
              enabled={props.eqEnabled}
              channelMode={eqChannelMode()}
              onBandChange={updateEqBand}
              onPreviewBandChange={previewEqBand}
              onBeginInteraction={beginEqInteraction}
              onCommitInteraction={commitEqInteraction}
              onCancelInteraction={cancelEqInteraction}
              onChannelModeChange={setEqChannelMode}
              onBandToggle={toggleEqBand}
              onToggleEnabled={(enabled) => {
                if (enabled !== props.eqEnabled) props.onToggleEq()
              }}
              onReset={resetEq}
              spectrumData={null}
            />
          </div>
        </DeviceCollapseProvider>
      </div>
    </div>
  )
}

export default EffectsPanel