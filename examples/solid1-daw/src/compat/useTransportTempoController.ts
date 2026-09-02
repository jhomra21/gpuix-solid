import { createEffect, createSignal, on, untrack, type Accessor } from "solid-js"

type Options = {
  bpm: Accessor<number>
  onChangeBpm: (next: number) => void
}

type PointerCaptureTarget = EventTarget & {
  setPointerCapture?: (pointerId: number) => void
  releasePointerCapture?: (pointerId: number) => void
  classList?: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
  }
}

export function useTransportTempoController(options: Options) {
  const [tempoDraft, setTempoDraft] = createSignal(String(options.bpm()))
  const [tempoEditing, setTempoEditing] = createSignal(false)
  const [tempoDragActive, setTempoDragActive] = createSignal(false)
  let tempoDragStartY = 0
  let tempoDragStartValue = 0

  createEffect(on(options.bpm, (value) => {
    if (!untrack(tempoEditing)) setTempoDraft(String(value))
  }))

  const sanitizeTempo = (value: number) => {
    if (!Number.isFinite(value)) return options.bpm()
    return Math.min(300, Math.max(30, Math.round(value)))
  }

  const commitTempo = () => {
    const raw = tempoDraft().trim()
    if (!raw) {
      setTempoDraft(String(options.bpm()))
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setTempoDraft(String(options.bpm()))
      return
    }
    const next = sanitizeTempo(parsed)
    setTempoDraft(String(next))
    if (next !== options.bpm()) options.onChangeBpm(next)
  }

  const pointerTarget = (event: PointerEvent): PointerCaptureTarget | undefined => {
    const target = event.currentTarget
    return target instanceof EventTarget ? target as PointerCaptureTarget : undefined
  }

  const beginTempoDrag = (event: PointerEvent) => {
    if (tempoDragActive()) return
    const target = pointerTarget(event)
    const parsedDraft = Number(tempoDraft())
    tempoDragStartValue = Number.isFinite(parsedDraft) ? sanitizeTempo(parsedDraft) : options.bpm()
    tempoDragStartY = event.clientY
    setTempoDragActive(true)
    setTempoEditing(true)
    target?.setPointerCapture?.(event.pointerId)
    target?.classList?.add("cursor-ns-resize")
  }

  const updateTempoDrag = (event: PointerEvent) => {
    if (!tempoDragActive()) return
    event.preventDefault()
    const deltaY = tempoDragStartY - event.clientY
    const sensitivity = event.shiftKey ? 0.2 : 0.8
    const next = sanitizeTempo(tempoDragStartValue + deltaY * sensitivity)
    if (next === options.bpm()) return
    setTempoDraft(String(next))
    options.onChangeBpm(next)
  }

  const endTempoDrag = (event: PointerEvent) => {
    if (!tempoDragActive()) return
    const target = pointerTarget(event)
    target?.releasePointerCapture?.(event.pointerId)
    target?.classList?.remove("cursor-ns-resize")
    setTempoDragActive(false)
    commitTempo()
    setTempoEditing(false)
  }

  return {
    tempoDraft,
    setTempoDraft,
    tempoEditing,
    setTempoEditing,
    commitTempo,
    beginTempoDrag,
    updateTempoDrag,
    endTempoDrag,
  }
}
