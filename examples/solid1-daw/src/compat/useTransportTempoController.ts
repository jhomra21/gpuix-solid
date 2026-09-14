import { createEffect, createSignal, on, onCleanup, untrack, type Accessor } from "solid-js"

type Options = {
  bpm: Accessor<number>
  onChangeBpm: (next: number) => void
}

export function useTransportTempoController(options: Options) {
  const [tempoDraft, setTempoDraft] = createSignal(String(options.bpm()))
  const [tempoEditing, setTempoEditing] = createSignal(false)
  const [tempoDragActive, setTempoDragActive] = createSignal(false)
  let tempoDragStartY = 0
  let tempoDragStartValue = 0
  let globalListenersArmed = false

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

  const updateFromPointer = (clientY: number, shiftKey: boolean): void => {
    if (!tempoDragActive()) return
    const deltaY = tempoDragStartY - clientY
    const sensitivity = shiftKey ? 0.2 : 0.8
    const next = sanitizeTempo(tempoDragStartValue + deltaY * sensitivity)
    if (next === options.bpm()) return
    setTempoDraft(String(next))
    options.onChangeBpm(next)
  }

  const disarmGlobalListeners = (): void => {
    if (!globalListenersArmed) return
    window.removeEventListener("pointermove", handleGlobalPointerMove, true)
    window.removeEventListener("pointerup", handleGlobalPointerUp, true)
    globalListenersArmed = false
  }

  const finishTempoDrag = (): void => {
    if (!tempoDragActive()) return
    setTempoDragActive(false)
    disarmGlobalListeners()
    commitTempo()
    setTempoEditing(false)
  }

  function handleGlobalPointerMove(event: PointerEvent): void {
    updateFromPointer(event.clientY, event.shiftKey)
  }

  function handleGlobalPointerUp(event: PointerEvent): void {
    updateFromPointer(event.clientY, event.shiftKey)
    finishTempoDrag()
  }

  const armGlobalListeners = (): void => {
    if (globalListenersArmed) return
    window.addEventListener("pointermove", handleGlobalPointerMove, true)
    window.addEventListener("pointerup", handleGlobalPointerUp, true)
    globalListenersArmed = true
  }

  const beginTempoDrag = (event: PointerEvent) => {
    if (tempoDragActive()) return
    const parsedDraft = Number(tempoDraft())
    tempoDragStartValue = Number.isFinite(parsedDraft) ? sanitizeTempo(parsedDraft) : options.bpm()
    tempoDragStartY = event.clientY
    setTempoDragActive(true)
    setTempoEditing(true)
    armGlobalListeners()
  }

  const updateTempoDrag = (event: PointerEvent) => {
    if (!tempoDragActive()) return
    event.preventDefault()
    updateFromPointer(event.clientY, event.shiftKey)
  }

  const endTempoDrag = (event: PointerEvent) => {
    if (!tempoDragActive()) return
    updateFromPointer(event.clientY, event.shiftKey)
    finishTempoDrag()
  }

  onCleanup(disarmGlobalListeners)

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
