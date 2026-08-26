import { createEffect, createSignal, on, untrack, type Accessor } from "solid-js"

type Options = {
  bpm: Accessor<number>
  onChangeBpm: (next: number) => void
}

export function useTransportTempoController(options: Options) {
  const [tempoDraft, setTempoDraft] = createSignal(String(options.bpm()))
  const [tempoEditing, setTempoEditing] = createSignal(false)

  createEffect(on(options.bpm, (value) => {
    if (!untrack(tempoEditing)) setTempoDraft(String(value))
  }))

  const commitTempo = () => {
    const parsed = Number(tempoDraft().trim())
    if (!Number.isFinite(parsed)) {
      setTempoDraft(String(options.bpm()))
      return
    }
    const next = Math.min(300, Math.max(30, Math.round(parsed)))
    setTempoDraft(String(next))
    if (next !== options.bpm()) options.onChangeBpm(next)
  }

  const ignorePointer = (_event: PointerEvent) => undefined

  return {
    tempoDraft,
    setTempoDraft,
    tempoEditing,
    setTempoEditing,
    commitTempo,
    beginTempoDrag: ignorePointer,
    updateTempoDrag: ignorePointer,
    endTempoDrag: ignorePointer,
  }
}
