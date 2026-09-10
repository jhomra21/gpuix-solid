import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import type { DiffusionEditorState } from "./compat"
import { Canvas } from "./canvas-native"

type SceneItemKind = "frame" | "rect" | "text"

type SceneItem = {
  id: string
  kind: SceneItemKind
  x: number
  y: number
  width: number
  height: number
}

type Point = { x: number; y: number }

type Gesture =
  | { kind: "create"; itemId: string; start: Point }
  | { kind: "move"; itemId: string; start: Point; itemStart: Point }
  | { kind: "pan"; start: Point; panStart: Point }

function localPoint(event: EventPayload): Point | undefined {
  const target = event.currentTarget
  if (!target) return undefined
  const bounds = target.getBoundingClientRect()
  return {
    x: (event.clientX ?? 0) - bounds.left,
    y: (event.clientY ?? 0) - bounds.top,
  }
}

function hitItem(items: readonly SceneItem[], point: Point, pan: Point): SceneItem | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    if (!item) continue
    const x = item.x + pan.x
    const y = item.y + pan.y
    if (point.x >= x && point.x <= x + item.width && point.y >= y && point.y <= y + item.height) return item
  }
  return undefined
}

function SceneItemView(props: { item: SceneItem; selected: boolean; pan: Point }): SolidElement {
  const x = () => props.item.x + props.pan.x
  const y = () => props.item.y + props.pan.y
  const common = () => ({
    position: "absolute" as const,
    left: x(),
    top: y(),
    width: props.item.width,
    height: props.item.height,
    pointerEvents: "none" as const,
  })

  return (
    <Show
      when={props.item.kind === "text"}
      fallback={
        <div
          testId={`diffusion-scene-${props.item.kind}-${props.item.id}`}
          style={{
            ...common(),
            borderWidth: props.selected ? 2 : 1,
            borderColor: props.selected ? "#6EA8FE" : props.item.kind === "frame" ? "#7C7C86" : "#5B8DEF",
            backgroundColor: props.item.kind === "frame" ? "#00000000" : "#5B8DEF55",
          }}
        />
      }
    >
      <div
        testId={`diffusion-scene-text-${props.item.id}`}
        style={{
          ...common(),
          borderWidth: props.selected ? 1 : 0,
          borderColor: "#6EA8FE",
          alignItems: "center",
          paddingLeft: 4,
        }}
      >
        <text style={{ color: "#181818", fontSize: 16, fontWeight: 600, pointerEvents: "none" }}>Text</text>
      </div>
    </Show>
  )
}

/**
 * Diffusion Studio's real canvas is ECS/browser-backed. The source-first native
 * demo keeps that unavailable engine behind this deterministic scene adapter,
 * but the visible Move/Hand/Frame/Rectangle/Text controls still need to behave
 * like editing tools rather than decorative buttons.
 */
export function InteractiveCanvas(props: {
  state: DiffusionEditorState
  promptOpen: () => boolean
  setPromptOpen: (value: boolean) => void
}): SolidElement {
  const [items, setItems] = createSignal<SceneItem[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [pan, setPan] = createSignal<Point>({ x: 0, y: 0 })
  const [gesture, setGesture] = createSignal<Gesture | null>(null)
  let nextItemId = 1

  const updateItem = (id: string, update: (item: SceneItem) => SceneItem): void => {
    setItems((current) => current.map((item) => item.id === id ? update(item) : item))
  }

  const begin = (event: EventPayload): void => {
    if ((event.button ?? 0) !== 0 || props.promptOpen()) return
    const point = localPoint(event)
    if (!point) return
    const tool = props.state.selectedTool()

    if (tool === "text") {
      const id = String(nextItemId++)
      setItems((current) => [...current, { id, kind: "text", x: point.x - pan().x, y: point.y - pan().y, width: 120, height: 32 }])
      setSelectedId(id)
      return
    }

    if (tool === "frame" || tool === "rect") {
      const id = String(nextItemId++)
      const scenePoint = { x: point.x - pan().x, y: point.y - pan().y }
      setItems((current) => [...current, { id, kind: tool, x: scenePoint.x, y: scenePoint.y, width: 1, height: 1 }])
      setSelectedId(id)
      setGesture({ kind: "create", itemId: id, start: point })
    } else if (tool === "move") {
      const item = hitItem(items(), point, pan())
      setSelectedId(item?.id ?? null)
      if (!item) return
      setGesture({ kind: "move", itemId: item.id, start: point, itemStart: { x: item.x, y: item.y } })
    } else if (tool === "hand") {
      setGesture({ kind: "pan", start: point, panStart: pan() })
    } else {
      return
    }

    const pointerId = event.pointerId ?? 1
    event.currentTarget?.setPointerCapture(pointerId)
    event.preventDefault?.()
  }

  const move = (event: EventPayload): void => {
    const active = gesture()
    if (!active) return
    const point = localPoint(event)
    if (!point) return
    const deltaX = point.x - active.start.x
    const deltaY = point.y - active.start.y

    if (active.kind === "pan") {
      setPan({ x: active.panStart.x + deltaX, y: active.panStart.y + deltaY })
      return
    }

    if (active.kind === "move") {
      updateItem(active.itemId, (item) => ({ ...item, x: active.itemStart.x + deltaX, y: active.itemStart.y + deltaY }))
      return
    }

    const currentPan = pan()
    const startX = active.start.x - currentPan.x
    const startY = active.start.y - currentPan.y
    const endX = point.x - currentPan.x
    const endY = point.y - currentPan.y
    updateItem(active.itemId, (item) => ({
      ...item,
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.max(1, Math.abs(endX - startX)),
      height: Math.max(1, Math.abs(endY - startY)),
    }))
  }

  const end = (event: EventPayload): void => {
    const active = gesture()
    if (!active) return
    if (active.kind === "create") {
      updateItem(active.itemId, (item) => item.width >= 4 && item.height >= 4
        ? item
        : { ...item, width: Math.max(96, item.width), height: Math.max(64, item.height) })
    }
    setGesture(null)
    const pointerId = event.pointerId ?? 1
    if (event.currentTarget?.hasPointerCapture(pointerId)) {
      event.currentTarget.releasePointerCapture(pointerId)
    }
  }

  return (
    <Canvas state={props.state} promptOpen={props.promptOpen} setPromptOpen={props.setPromptOpen}>
      <div
        testId="diffusion-canvas-interaction-surface"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 72,
          cursor: props.state.selectedTool() === "hand"
            ? gesture()?.kind === "pan" ? "grabbing" : "grab"
            : props.state.selectedTool() === "move" ? "default" : "crosshair",
          pointerEvents: props.promptOpen() ? "none" : "auto",
          backgroundColor: "#00000000",
        }}
      >
        <For each={items()}>
          {(item) => <SceneItemView item={item} selected={selectedId() === item.id} pan={pan()} />}
        </For>
      </div>
    </Canvas>
  )
}
