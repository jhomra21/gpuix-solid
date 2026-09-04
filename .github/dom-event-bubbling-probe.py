from pathlib import Path

for package in ["packages/solid1", "packages/solid"]:
    path = Path(package) / "src/host/events.ts"
    source = path.read_text()

    constants_anchor = '''const DOUBLE_CLICK_MS = 500
const DOUBLE_CLICK_DISTANCE_PX = 4
'''
    constants_replacement = '''const DOUBLE_CLICK_MS = 500
const DOUBLE_CLICK_DISTANCE_PX = 4
const BUBBLING_DOM_EVENTS = new Set([
  "auxClick",
  "change",
  "click",
  "contextMenu",
  "dblClick",
  "input",
  "keyDown",
  "keyUp",
  "mouseDown",
  "mouseMove",
  "mouseOut",
  "mouseOver",
  "mouseUp",
  "pointerCancel",
  "pointerDown",
  "pointerMove",
  "pointerUp",
  "submit",
])

type EventPathTarget = DomCompatTarget & {
  readonly id?: number
  readonly parentNode?: EventPathTarget | null
}
'''
    if constants_anchor not in source:
        raise SystemExit(f"constants anchor missing in {path}")
    source = source.replace(constants_anchor, constants_replacement, 1)

    create_anchor = '''function createTargetEvent(eventType: string, event: EventPayload, target: EventTarget): Event {
  const domEvent = new Event(browserEventName(eventType), { bubbles: true, cancelable: true })
  const originalPreventDefault = domEvent.preventDefault.bind(domEvent)
  const originalStopPropagation = domEvent.stopPropagation.bind(domEvent)
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: target },
'''
    create_replacement = '''function createTargetEvent(
  eventType: string,
  event: EventPayload,
  currentTarget: EventTarget,
  target: EventTarget = currentTarget,
): Event {
  const domEvent = new Event(browserEventName(eventType), { bubbles: BUBBLING_DOM_EVENTS.has(eventType), cancelable: true })
  const originalPreventDefault = domEvent.preventDefault.bind(domEvent)
  const originalStopPropagation = domEvent.stopPropagation.bind(domEvent)
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: currentTarget },
'''
    if create_anchor not in source:
        raise SystemExit(f"createTargetEvent anchor missing in {path}")
    source = source.replace(create_anchor, create_replacement, 1)

    composed_anchor = '''    composedPath: { configurable: true, value: () => [target] },
'''
    composed_replacement = '''    composedPath: { configurable: true, value: () => currentTarget === target ? [target] : [target, currentTarget] },
'''
    if composed_anchor not in source:
        raise SystemExit(f"createTargetEvent composedPath anchor missing in {path}")
    source = source.replace(composed_anchor, composed_replacement, 1)

    dispatch_anchor = '''  #dispatchDom(
    elementId: number,
    eventType: string,
    nativeEvent: NativeEventPayload,
    globalOnly = false,
  ): EventPayload | undefined {
    if (!this.#live.has(elementId)) return undefined
    const target = this.#targets.get(elementId)
    const event = domCompatibleEvent({ ...nativeEvent, elementId }, target, eventType)
    if (!globalOnly) {
      this.#handlers.get(elementId)?.get(eventType)?.(event)
      if (target) target.dispatchEvent(createTargetEvent(eventType, event, target))
    }
    dispatchGlobalEvent(eventType, event)
    return event
  }
'''
    dispatch_replacement = '''  #dispatchDom(
    elementId: number,
    eventType: string,
    nativeEvent: NativeEventPayload,
    globalOnly = false,
  ): EventPayload | undefined {
    if (!this.#live.has(elementId)) return undefined
    const target = this.#targets.get(elementId)
    const event = domCompatibleEvent({ ...nativeEvent, elementId }, target, eventType)
    if (!globalOnly) {
      let currentId: number | undefined = elementId
      while (currentId !== undefined && this.#live.has(currentId)) {
        const currentTarget = this.#targets.get(currentId)
        if (!currentTarget) break
        Object.defineProperty(event, "currentTarget", { configurable: true, value: currentTarget })
        this.#handlers.get(currentId)?.get(eventType)?.(event)
        currentTarget.dispatchEvent(createTargetEvent(eventType, event, currentTarget, target ?? currentTarget))
        if (event.cancelBubble || !BUBBLING_DOM_EVENTS.has(eventType)) break
        const parent = (currentTarget as EventPathTarget).parentNode
        currentId = typeof parent?.id === "number" ? parent.id : undefined
      }
    }
    if (!event.cancelBubble) dispatchGlobalEvent(eventType, event)
    return event
  }
'''
    if dispatch_anchor not in source:
        raise SystemExit(f"#dispatchDom anchor missing in {path}")
    source = source.replace(dispatch_anchor, dispatch_replacement, 1)

    path.write_text(source)
